/**
 * Why a service call couldn't produce data. Shared by the weather client and,
 * downstream, by a tool's `status: 'failed'` yield — so a fallback card can
 * render a specific, honest reason instead of a generic error.
 */
export type FailureReason = 'not_found' | 'invalid_response' | 'timeout' | 'upstream_error';

/**
 * A service-layer result that never throws: callers branch on `ok` instead
 * of wrapping every call in try/catch.
 */
export type Result<T> = { ok: true; data: T } | { ok: false; reason: FailureReason };

/** Why the chat route rejected a request before calling the model. */
export type GuardReason = 'invalid_request' | 'input_too_long' | 'too_many_turns' | 'rate_limited' | 'budget_exceeded';
