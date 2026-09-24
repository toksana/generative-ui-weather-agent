import { trace } from '@opentelemetry/api';
import { startObservation } from '@langfuse/tracing';

/**
 * Records a cache hit/miss as an attribute on whatever observation is
 * currently active. Safe no-op when no tracer is registered (the default
 * OTel API returns a no-op span with no active tracer provider) — caching
 * itself always works via `weather-cache.ts`'s in-memory fallback; this only
 * affects whether the hit/miss is visible in a trace.
 */
export function recordCacheResult(kind: 'geo' | 'forecast', hit: boolean): void {
  trace.getActiveSpan()?.setAttribute(`cache.${kind}.hit`, hit);
}

/**
 * Marks a point-in-time frame — `ttft` (time to first stream chunk) or
 * `first_frame` (time to the first `located` yield, the metric the
 * progressive-streaming design is meant to improve) — as a Langfuse `event`
 * observation nested under whatever observation is currently active.
 * `startObservation(..., { asType: 'event' })` auto-ends itself; safe no-op
 * when no Langfuse SDK is registered.
 */
export function markFrame(name: 'ttft' | 'first_frame'): void {
  startObservation(name, {}, { asType: 'event' });
}
