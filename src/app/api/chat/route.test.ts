import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/ratelimit', () => ({ checkRateLimit: vi.fn() }));
vi.mock('@/lib/budget', () => ({ checkBudget: vi.fn() }));
vi.mock('@/lib/ai/provider', () => ({ getModel: vi.fn() }));
vi.mock('@/instrumentation', () => ({ langfuseSpanProcessor: undefined }));
vi.mock('@langfuse/tracing', () => ({
  observe: (fn: (request: Request) => Promise<Response>) => fn,
  propagateAttributes: (_attrs: unknown, fn: () => Promise<Response>) => fn(),
  updateActiveObservation: vi.fn(),
}));
vi.mock('@opentelemetry/api', () => ({
  trace: { getActiveSpan: () => undefined },
}));
vi.mock('next/server', () => ({ after: (fn: () => void) => fn() }));
vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return { ...actual, streamText: vi.fn() };
});

import { streamText } from 'ai';

import { checkBudget } from '@/lib/budget';
import { checkRateLimit } from '@/lib/ratelimit';

import { handler } from './route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function validMessage(text: string) {
  return { id: 'm1', role: 'user', parts: [{ type: 'text', text }] };
}

describe('chat route handler', () => {
  beforeEach(() => {
    vi.mocked(checkRateLimit).mockResolvedValue(true);
    vi.mocked(checkBudget).mockResolvedValue(true);
    vi.mocked(streamText).mockReturnValue({
      stream: new ReadableStream({
        start(controller) {
          controller.close();
        },
      }),
    } as unknown as ReturnType<typeof streamText>);
  });

  it('rejects a malformed JSON body', async () => {
    // Act
    const response = await handler(makeRequest('not json'));

    // Assert
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ reason: 'invalid_request' });
  });

  it('rejects a body whose messages field is missing', async () => {
    // Act
    const response = await handler(makeRequest({ id: 's1' }));

    // Assert
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ reason: 'invalid_request' });
  });

  it('rejects a body whose messages are not the expected shape', async () => {
    // Act
    const response = await handler(makeRequest({ messages: [{ role: 'user' }] }));

    // Assert
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ reason: 'invalid_request' });
  });

  it('rejects input over the max length', async () => {
    // Arrange
    const longText = 'a'.repeat(501);

    // Act
    const response = await handler(makeRequest({ messages: [validMessage(longText)] }));

    // Assert
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ reason: 'input_too_long' });
  });

  it('rejects a conversation over the max turns', async () => {
    // Arrange
    const messages = Array.from({ length: 21 }, (_, i) => validMessage(`turn ${i}`));

    // Act
    const response = await handler(makeRequest({ messages }));

    // Assert
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ reason: 'too_many_turns' });
  });

  it('rejects when the rate limit is exceeded', async () => {
    // Arrange
    vi.mocked(checkRateLimit).mockResolvedValue(false);

    // Act
    const response = await handler(makeRequest({ messages: [validMessage('hi')] }));

    // Assert
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ reason: 'rate_limited' });
  });

  it('rejects when the daily budget is exceeded', async () => {
    // Arrange
    vi.mocked(checkBudget).mockResolvedValue(false);

    // Act
    const response = await handler(makeRequest({ messages: [validMessage('hi')] }));

    // Assert
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ reason: 'budget_exceeded' });
  });

  it('calls streamText once a valid request clears every guard', async () => {
    // Act
    await handler(makeRequest({ messages: [validMessage('What is the weather in Tokyo?')] }));

    // Assert
    expect(streamText).toHaveBeenCalledOnce();
  });
});
