import { anthropic } from '@ai-sdk/anthropic';
import type { LanguageModel } from 'ai';

/**
 * Cheapest model that clears the tool-choice eval bar (see `/evals`). Bump to
 * `claude-sonnet-5` via `ANTHROPIC_MODEL_ID` if a future prompt change drops
 * accuracy below the 95% threshold the eval suite enforces.
 */
const DEFAULT_MODEL_ID = 'claude-haiku-4-5';

export function getModel(): LanguageModel {
  return anthropic(process.env.ANTHROPIC_MODEL_ID ?? DEFAULT_MODEL_ID);
}
