'use client';

import { useLayoutEffect, useSyncExternalStore } from 'react';

import { Button } from '@/components/ui/button';

type Theme = 'light' | 'dark';

const THEME_CHANGE_EVENT = 'weather-chat:theme-change';

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // localStorage unavailable (private mode, blocked) — fall through to system preference.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readServerTheme(): Theme {
  return 'light';
}

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', onChange);
  window.addEventListener('storage', onChange);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => {
    media.removeEventListener('change', onChange);
    window.removeEventListener('storage', onChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  };
}

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function ThemeToggle() {
  // useSyncExternalStore renders with readServerTheme() during SSR/hydration
  // (matching the inline script's default) and re-renders with the real
  // client value right after — the sanctioned way to read an external,
  // client-only source without a hydration mismatch or a setState-in-effect.
  const theme = useSyncExternalStore(subscribe, readTheme, readServerTheme);

  // React Strict Mode's dev-only remount resets <html>'s class list to what
  // layout.tsx's JSX declares, clearing the class the inline script set
  // before first paint — reapply it here. No-op in production.
  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function toggle(): void {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem('theme', next);
    } catch {
      // localStorage unavailable — the dispatched event still flips the theme for this tab.
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </Button>
  );
}
