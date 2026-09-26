import { useEffect, useRef } from 'react';

import { partKey } from '@/lib/chat/part-key';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/ai/tools';

import { MessagePart } from './message-part';

interface MessageListProps {
  messages: ChatMessage[];
  onSuggestedPrompt: (prompt: string) => void;
}

const NEAR_BOTTOM_THRESHOLD_PX = 120;

export function MessageList({ messages, onSuggestedPrompt }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom <= NEAR_BOTTOM_THRESHOLD_PX) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  return (
    <div
      ref={containerRef}
      role="log"
      aria-live="polite"
      className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-6"
    >
      {messages.map((message) => (
        <div key={message.id} className={cn('flex', message.role === 'user' && 'justify-end')}>
          <div className={cn('flex max-w-full flex-col gap-2', message.role === 'assistant' && 'w-full')}>
            {message.parts.map((part, index) => (
              <MessagePart key={partKey(part, index)} part={part} onSuggestedPrompt={onSuggestedPrompt} />
            ))}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
