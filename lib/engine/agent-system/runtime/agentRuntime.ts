import { chat } from "@storyplay/ai-client";
import type { ProviderConfig } from "@storyplay/types";
import type { AgentContract } from "../types";

export type AgentRunResult<TOutput> = {
  ok: boolean;
  agentId: AgentContract["id"];
  output: TOutput;
  raw?: string;
  durationMs: number;
  error?: unknown;
};

type AgentExecution<TOutput> = () => Promise<{
  output: TOutput;
  raw?: string;
}>;

function logAgentRun<TOutput>(
  contract: AgentContract<unknown, TOutput>,
  result: AgentRunResult<TOutput>,
): void {
  const status = result.ok ? "ok" : "fallback";
  console.log(
    `[agent:${contract.id}] ${status} kind=${contract.kind} modelRole=${contract.modelRole} duration=${result.durationMs}ms`,
  );
}

export async function runAgent<TInput, TOutput>(
  contract: AgentContract<TInput, TOutput>,
  input: TInput,
  execute: AgentExecution<TOutput>,
): Promise<AgentRunResult<TOutput>> {
  const startedAt = Date.now();
  try {
    const { output, raw } = await execute();
    const result: AgentRunResult<TOutput> = {
      ok: true,
      agentId: contract.id,
      output,
      raw,
      durationMs: Date.now() - startedAt,
    };
    logAgentRun(contract as AgentContract<unknown, TOutput>, result);
    return result;
  } catch (error) {
    if (!contract.fallback) {
      throw error;
    }
    const output = await contract.fallback(input, error);
    const result: AgentRunResult<TOutput> = {
      ok: false,
      agentId: contract.id,
      output,
      durationMs: Date.now() - startedAt,
      error,
    };
    logAgentRun(contract as AgentContract<unknown, TOutput>, result);
    return result;
  }
}

export async function runTextAgent<TInput, TOutput>(
  config: ProviderConfig,
  contract: AgentContract<TInput, TOutput>,
  input: TInput,
  opts?: {
    temperature?: number;
    tag?: string;
  },
): Promise<AgentRunResult<TOutput>> {
  if (!contract.buildMessages) {
    throw new Error(`Agent "${contract.id}" has no buildMessages implementation.`);
  }
  if (!contract.parseOutput) {
    throw new Error(`Agent "${contract.id}" has no parseOutput implementation.`);
  }

  return runAgent(contract, input, async () => {
    const raw = await chat(config, contract.buildMessages!(input), {
      temperature: opts?.temperature,
      tag: opts?.tag ?? contract.id,
    });
    return {
      raw,
      output: contract.parseOutput!(raw, input),
    };
  });
}
