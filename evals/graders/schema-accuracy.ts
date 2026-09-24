import type { z } from 'zod';

import { weatherTools } from '@/lib/ai/tools';

import type { EvalCase } from '../datasets/cases';
import type { EvalToolCall } from './tool-choice';

// Every tool in this project is defined with a literal Zod input schema, so
// this cast is safe even though `Tool['inputSchema']` is typed more loosely
// to also accept JSON Schema / schema factories.
const inputSchemas: Record<string, z.ZodTypeAny> = Object.fromEntries(
  Object.entries(weatherTools).map(([name, tool]) => [name, tool.inputSchema as z.ZodTypeAny]),
);

/**
 * Zod-validates the model's tool-call arguments against that tool's real
 * `inputSchema`, plus case-specific spot checks (hourly metric, compared
 * cities) that a bare schema pass can't catch on its own.
 */
export function gradeSchemaAccuracy(evalCase: EvalCase, toolCalls: EvalToolCall[]): boolean {
  if (evalCase.expectedTool === null) return toolCalls.length === 0;
  if (toolCalls.length !== 1) return false;

  const [call] = toolCalls;
  const schema = inputSchemas[call.toolName];
  if (!schema) return false;

  const parsed = schema.safeParse(call.input);
  if (!parsed.success) return false;

  if (evalCase.expectedMetric) {
    const metric = (parsed.data as { metric?: string }).metric;
    if (metric !== evalCase.expectedMetric) return false;
  }

  if (evalCase.expectedCities) {
    const cities = (parsed.data as { cities?: string[] }).cities ?? [];
    const allMatched = evalCase.expectedCities.every((expected) =>
      cities.some((city) => city.toLowerCase().includes(expected.toLowerCase())),
    );
    if (!allMatched) return false;
  }

  return true;
}
