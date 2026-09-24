import { createHash } from 'node:crypto';

import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
} from 'ai';

import { getModel } from '@/lib/ai/provider';
import { SYSTEM_PROMPT } from '@/lib/ai/system-prompt';
import { weatherTools, type ChatMessage } from '@/lib/ai/tools';
import { checkBudget } from '@/lib/budget';
import { checkRateLimit } from '@/lib/ratelimit';
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
  return Response.json({ reason }, { status });
}

export async function POST(request: Request) {
  const { messages }: { messages: ChatMessage[] } = await request.json();

  if (latestUserText(messages).length > MAX_INPUT_LENGTH) {
    return guardResponse('input_too_long', 400);
  }
  if (messages.length > MAX_TURNS) {
    return guardResponse('too_many_turns', 400);
  }
  if (!(await checkRateLimit(clientIdentifier(request)))) {
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
    onFinish: ({ finishReason }) => {
      if (finishReason === 'length') {
        console.warn('chat response truncated by maxOutputTokens');
      }
    },
    onError: ({ error }) => {
      if (error instanceof Error) {
        console.error('streamText error', error.message);
      } else {
        console.error('streamText error', error);
      }
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
