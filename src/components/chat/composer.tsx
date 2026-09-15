'use client';

import { useState, type SubmitEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ComposerProps {
  disabled?: boolean;
  onSubmit: (text: string) => void;
}

export function Composer({ disabled, onSubmit }: ComposerProps) {
  const [value, setValue] = useState('');

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = value.trim();
    if (!text) return;
    onSubmit(text);
    setValue('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border p-4">
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Ask about the weather anywhere…"
        aria-label="Ask about the weather"
        disabled={disabled}
      />
      <Button type="submit" variant="info" disabled={disabled || value.trim().length === 0}>
        Send
      </Button>
    </form>
  );
}
