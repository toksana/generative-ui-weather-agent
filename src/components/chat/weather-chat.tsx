'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

import type { ChatMessage } from '@/lib/ai/tools';
import type { GuardReason } from '@/lib/types';

import { Composer } from './composer';
import { MessageList } from './message-list';
import { parseGuardReason, RateLimitNotice } from './rate-limit-notice';

export function WeatherChat() {
  const [guardReason, setGuardReason] = useState<GuardReason | null>(null);
  const { messages, sendMessage, status } = useChat<ChatMessage>({
    onError: (error) => setGuardReason(parseGuardReason(error)),
  });
  const busy = status === 'submitted' || status === 'streaming';

  function handleSubmit(text: string) {
    setGuardReason(null);
    sendMessage({ text });
  }

  return (
    <div className="flex h-full w-full max-w-3xl flex-col">
      <MessageList messages={messages} onSuggestedPrompt={handleSubmit} />
      {guardReason && (
        <div className="px-4 pb-2">
          <RateLimitNotice reason={guardReason} />
        </div>
      )}
      <Composer disabled={busy} onSubmit={handleSubmit} />
    </div>
  );
}
