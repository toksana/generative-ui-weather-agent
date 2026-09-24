'use client';

import { useLayoutEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

type Theme = 'light' | 'dark';

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // localStorage unavailable (private mode, blocked) — fall through to system preference.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => (typeof window === 'undefined' ? 'light' : readStoredTheme()));

  // React Strict Mode's dev-only remount resets <html>'s class list to what
  // layout.tsx's JSX declares, clearing the class the inline script set
  // before first paint — reapply it here. No-op in production.
  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function toggle(): void {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      // localStorage unavailable — the class toggle above still applies for this session.
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      suppressHydrationWarning
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </Button>
  );
}
