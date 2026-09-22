import { partKey } from '@/lib/chat/part-key';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/ai/tools';

import { MessagePart } from './message-part';

interface MessageListProps {
  messages: ChatMessage[];
  onSuggestedPrompt: (prompt: string) => void;
}

export function MessageList({ messages, onSuggestedPrompt }: MessageListProps) {
  return (
    <div role="log" aria-live="polite" className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-6">
      {messages.map((message) => (
        <div key={message.id} className={cn('flex', message.role === 'user' && 'justify-end')}>
          <div className="flex max-w-full flex-col gap-2">
            {message.parts.map((part, index) => (
              <MessagePart key={partKey(part, index)} part={part} onSuggestedPrompt={onSuggestedPrompt} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
