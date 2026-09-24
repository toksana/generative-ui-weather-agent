import type { EvalRegion } from './datasets/cases';

export const TOOL_CHOICE_ACCURACY_THRESHOLD = 0.95;
export const SCHEMA_VALIDITY_THRESHOLD = 0.98;

export interface EvalResult {
  caseId: string;
  region: EvalRegion;
  model: string;
  toolChoiceCorrect: boolean;
  schemaValid: boolean;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
}

export interface ModelSummary {
  model: string;
  caseCount: number;
  toolChoiceAccuracy: number;
  schemaValidity: number;
  meanLatencyMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

export function summarizeByModel(results: EvalResult[]): ModelSummary[] {
  const models = [...new Set(results.map((result) => result.model))];

  return models.map((model) => {
    const forModel = results.filter((result) => result.model === model);
    const caseCount = forModel.length;
    const toolChoiceAccuracy = forModel.filter((r) => r.toolChoiceCorrect).length / caseCount;
    const schemaValidity = forModel.filter((r) => r.schemaValid).length / caseCount;
    const meanLatencyMs = forModel.reduce((sum, r) => sum + r.latencyMs, 0) / caseCount;
    const totalInputTokens = forModel.reduce((sum, r) => sum + r.inputTokens, 0);
    const totalOutputTokens = forModel.reduce((sum, r) => sum + r.outputTokens, 0);

    return { model, caseCount, toolChoiceAccuracy, schemaValidity, meanLatencyMs, totalInputTokens, totalOutputTokens };
  });
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Renders a markdown-ish table. Reports raw token usage rather than a
 * dollar-cost estimate — hardcoding per-model pricing here would silently
 * go stale; Langfuse's tracing (Phase 3's other half) already computes cost
 * per generation from its own pricing table.
 */
export function formatReport(summaries: ModelSummary[]): string {
  const header = '| Model | Cases | Tool-choice accuracy | Schema validity | Mean latency | Input tokens | Output tokens |';
  const separator = '|---|---|---|---|---|---|---|';
  const rows = summaries.map((s) => {
    const toolFlag = s.toolChoiceAccuracy >= TOOL_CHOICE_ACCURACY_THRESHOLD ? '' : ' ⚠️';
    const schemaFlag = s.schemaValidity >= SCHEMA_VALIDITY_THRESHOLD ? '' : ' ⚠️';
    return `| ${s.model} | ${s.caseCount} | ${pct(s.toolChoiceAccuracy)}${toolFlag} | ${pct(s.schemaValidity)}${schemaFlag} | ${Math.round(s.meanLatencyMs)}ms | ${s.totalInputTokens} | ${s.totalOutputTokens} |`;
  });
  return [header, separator, ...rows].join('\n');
}

export function meetsThresholds(summaries: ModelSummary[]): boolean {
  return summaries.every(
    (s) => s.toolChoiceAccuracy >= TOOL_CHOICE_ACCURACY_THRESHOLD && s.schemaValidity >= SCHEMA_VALIDITY_THRESHOLD,
  );
}
