import type { EvalCase } from '../datasets/cases';

export interface EvalToolCall {
  toolName: string;
  input: unknown;
}

/** Exact tool-name match; `expectedTool: null` requires zero tool calls. */
export function gradeToolChoice(evalCase: EvalCase, toolCalls: EvalToolCall[]): boolean {
  if (evalCase.expectedTool === null) return toolCalls.length === 0;
  return toolCalls.length === 1 && toolCalls[0].toolName === evalCase.expectedTool;
}
