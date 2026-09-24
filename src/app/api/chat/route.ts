import { createHash } from 'node:crypto';

import { observe, propagateAttributes, updateActiveObservation } from '@langfuse/tracing';
import { trace } from '@opentelemetry/api';
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
} from 'ai';
import { after } from 'next/server';

import { langfuseSpanProcessor } from '@/instrumentation';
import { getModel } from '@/lib/ai/provider';
import { SYSTEM_PROMPT } from '@/lib/ai/system-prompt';
import { weatherTools, type ChatMessage } from '@/lib/ai/tools';
import { checkBudget } from '@/lib/budget';
import { checkRateLimit } from '@/lib/ratelimit';
import { markFrame } from '@/lib/telemetry';
import type { GuardReason } from '@/lib/types';

export const maxDuration = 30;

const MAX_OUTPUT_TOKENS = 1024;
const MAX_INPUT_LENGTH = 500;
const MAX_TURNS = 20;

function latestUserText(messages: ChatMessage[]): string {
  const last = messages.at(-1);
  if (!last || last.role !== 'user') return '';
  return last.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

function clientIdentifier(request: Request): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const salt = process.env.RATE_LIMIT_SALT ?? '';
  return createHash('sha256').update(`${ip}${salt}`).digest('hex');
}

function guardResponse(reason: GuardReason, status: number): Response {
  updateActiveObservation({ output: `rejected: ${reason}` });
  trace.getActiveSpan()?.end();
  return Response.json({ reason }, { status });
}

async function handler(request: Request): Promise<Response> {
  const { messages, id }: { messages: ChatMessage[]; id?: string } = await request.json();
  const userId = clientIdentifier(request);

  return propagateAttributes({ traceName: 'handle-chat-message', sessionId: id, userId }, async () => {
    updateActiveObservation({ input: latestUserText(messages) });
    after(async () => {
      await langfuseSpanProcessor?.forceFlush();
    });

    if (latestUserText(messages).length > MAX_INPUT_LENGTH) {
      return guardResponse('input_too_long', 400);
    }
    if (messages.length > MAX_TURNS) {
      return guardResponse('too_many_turns', 400);
    }
    if (!(await checkRateLimit(userId))) {
      return guardResponse('rate_limited', 429);
    }
    if (!(await checkBudget())) {
      return guardResponse('budget_exceeded', 429);
    }

    const result = streamText({
      model: getModel(),
      instructions: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      tools: weatherTools,
      stopWhen: stepCountIs(4),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      onFinish: ({ finishReason, text }) => {
        if (finishReason === 'length') {
          console.warn('chat response truncated by maxOutputTokens');
        }
        updateActiveObservation({ output: text });
        trace.getActiveSpan()?.end();
      },
      onError: ({ error }) => {
        if (error instanceof Error) {
          console.error('streamText error', error.message);
        } else {
          console.error('streamText error', error);
        }
        updateActiveObservation({ output: error });
        trace.getActiveSpan()?.end();
      },
    });

    let ttftMarked = false;
    const stream = result.stream.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          if (!ttftMarked) {
            ttftMarked = true;
            markFrame('ttft');
          }
          controller.enqueue(chunk);
        },
      }),
    );

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream }),
    });
  });
}

export const POST = observe(handler, {
  name: 'handle-chat-message',
  endOnExit: false,
  captureInput: false,
  captureOutput: false,
});
