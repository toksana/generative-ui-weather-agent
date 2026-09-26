import { anthropic } from '@ai-sdk/anthropic';
import { generateText, stepCountIs } from 'ai';

import { DEFAULT_MODEL_ID, ESCALATION_MODEL_ID } from '@/config/constants';
import { SYSTEM_PROMPT } from '@/lib/ai/system-prompt';
import { weatherTools } from '@/lib/ai/tools';

import { EVAL_CASES, type EvalCase } from './datasets/cases';
import { gradeSchemaAccuracy } from './graders/schema-accuracy';
import type { EvalToolCall } from './graders/tool-choice';
import { gradeToolChoice } from './graders/tool-choice';
import { formatReport, meetsThresholds, summarizeByModel, type EvalResult } from './report';

try {
  process.loadEnvFile('.env.local');
} catch {
  // No .env.local (e.g. CI providing ANTHROPIC_API_KEY directly) — fine.
}

const MODEL_IDS = [DEFAULT_MODEL_ID, ESCALATION_MODEL_ID] as const;

// Same description/inputSchema as the real tools, `execute` omitted so
// `generateText` returns the raw tool call to grade instead of hitting
// Open-Meteo — this suite grades tool choice and argument-schema accuracy,
// not the weather client (that's covered by client.test.ts). The cast
// mirrors `typeof weatherTools` since TS can't unify `tool()`'s generic
// across a `.map()` over heterogeneous input schemas.
const evalTools = Object.fromEntries(
  Object.entries(weatherTools).map(([name, t]) => [name, { description: t.description, inputSchema: t.inputSchema }]),
) as unknown as typeof weatherTools;

async function runCase(modelId: string, evalCase: EvalCase): Promise<EvalResult> {
  const start = Date.now();
  const result = await generateText({
    model: anthropic(modelId),
    instructions: SYSTEM_PROMPT,
    prompt: evalCase.prompt,
    tools: evalTools,
    stopWhen: stepCountIs(1),
  });
  const latencyMs = Date.now() - start;

  const toolCalls: EvalToolCall[] = result.toolCalls.map((call) => ({
    toolName: call.toolName,
    input: call.input,
  }));

  return {
    caseId: evalCase.id,
    region: evalCase.region,
    model: modelId,
    toolChoiceCorrect: gradeToolChoice(evalCase, toolCalls),
    schemaValid: gradeSchemaAccuracy(evalCase, toolCalls),
    latencyMs,
    inputTokens: result.usage.inputTokens ?? 0,
    outputTokens: result.usage.outputTokens ?? 0,
  };
}

async function main(): Promise<void> {
  const results: EvalResult[] = [];

  for (const modelId of MODEL_IDS) {
    for (const evalCase of EVAL_CASES) {
      const result = await runCase(modelId, evalCase);
      results.push(result);
      const mark = result.toolChoiceCorrect && result.schemaValid ? '✓' : '✗';
      console.log(`${mark} [${modelId}] ${evalCase.id} (${evalCase.region})`);
    }
  }

  const summaries = summarizeByModel(results);
  console.log('\n' + formatReport(summaries) + '\n');

  const failures = results.filter((r) => !r.toolChoiceCorrect || !r.schemaValid);
  if (failures.length > 0) {
    console.log('Failed cases:');
    for (const f of failures) {
      console.log(`  ${f.model} / ${f.caseId}: toolChoice=${f.toolChoiceCorrect} schemaValid=${f.schemaValid}`);
    }
  }

  if (!meetsThresholds(summaries)) {
    console.error('\nBelow threshold — see docs/ARCHITECTURE.md Phase 3 for the 95%/98% targets.');
    process.exit(1);
  }
}

main();
