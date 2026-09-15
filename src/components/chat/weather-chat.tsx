'use client';

import { useChat } from '@ai-sdk/react';

import type { ChatMessage } from '@/lib/ai/tools';

import { Composer } from './composer';
import { MessageList } from './message-list';

export function WeatherChat() {
  const { messages, sendMessage, status } = useChat<ChatMessage>();
  const busy = status === 'submitted' || status === 'streaming';

  return (
    <div className="flex h-full w-full max-w-3xl flex-col">
      <MessageList messages={messages} />
      <Composer disabled={busy} onSubmit={(text) => sendMessage({ text })} />
    </div>
  );
}
