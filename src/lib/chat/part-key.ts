import type { ChatMessage } from '@/lib/ai/tools';

export type MessagePart = ChatMessage['parts'][number];

export function partKey(part: MessagePart, index: number): string {
  return 'toolCallId' in part ? part.toolCallId : `${part.type}-${index}`;
}
