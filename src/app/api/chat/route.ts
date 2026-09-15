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

export const maxDuration = 30;

const MAX_OUTPUT_TOKENS = 1024;

export async function POST(request: Request) {
  const { messages }: { messages: ChatMessage[] } = await request.json();

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
