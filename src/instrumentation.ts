import type { LangfuseSpanProcessor as LangfuseSpanProcessorType } from '@langfuse/otel';

export let langfuseSpanProcessor: LangfuseSpanProcessorType | undefined;

/**
 * Registers Langfuse tracing for `ai@7`'s callback-based telemetry. No-op
 * outside the Node runtime and when Langfuse credentials are unset — same
 * "optional, falls back gracefully" convention as `getRedis()`, so local dev
 * needs only `ANTHROPIC_API_KEY`.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) return;

  const { LangfuseSpanProcessor } = await import('@langfuse/otel');
  const { LangfuseVercelAiSdkIntegration } = await import('@langfuse/vercel-ai-sdk');
  const { NodeSDK } = await import('@opentelemetry/sdk-node');
  const { registerTelemetry } = await import('ai');

  langfuseSpanProcessor = new LangfuseSpanProcessor();
  new NodeSDK({ spanProcessors: [langfuseSpanProcessor] }).start();
  registerTelemetry(new LangfuseVercelAiSdkIntegration());
}
