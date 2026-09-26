/**
 * App-wide tunable values that were previously duplicated or scattered inline.
 * Not every constant in the codebase belongs here — only ones with more than
 * one call site, or that document a default an env var can override.
 */

export const DEFAULT_MODEL_ID = 'claude-haiku-4-5';
export const ESCALATION_MODEL_ID = 'claude-sonnet-5';

/** Open-Meteo's forecast horizon; also stated in the system prompt and `explainCapability`'s description. */
export const FORECAST_HORIZON_DAYS = 16;

export const DEFAULT_RATE_LIMIT_MAX = 5;
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_OPEN_METEO_BASE_URL = 'https://api.open-meteo.com';
export const DEFAULT_OPEN_METEO_GEOCODING_BASE_URL = 'https://geocoding-api.open-meteo.com';
