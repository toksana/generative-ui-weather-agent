'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

import { ThemeToggle } from '@/components/theme-toggle';
import type { ChatMessage } from '@/lib/ai/tools';
import type { GuardReason } from '@/lib/types';

import { Composer } from './composer';
import { MessageList } from './message-list';
import { parseGuardReason, RateLimitNotice } from './rate-limit-notice';
import { SuggestedPrompts } from './suggested-prompts';

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
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-sm font-medium text-muted-foreground">Weather Chat</span>
        <ThemeToggle />
      </header>
      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="max-w-sm text-base text-muted-foreground md:text-lg">
            Ask about current weather in one city, compare a few, get an hourly forecast, or ask something out of
            scope to see what this assistant can&apos;t do.
          </p>
          <SuggestedPrompts onSelectPrompt={handleSubmit} />
        </div>
      ) : (
        <MessageList messages={messages} onSuggestedPrompt={handleSubmit} />
      )}
      {guardReason && (
        <div className="px-4 pb-2">
          <RateLimitNotice reason={guardReason} />
        </div>
      )}
      <Composer disabled={busy} onSubmit={handleSubmit} />
    </div>
  );
}
