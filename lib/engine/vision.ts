import { interpretClick } from "@storyplay/ai-client";
import type {
  ClickIntent,
  ProviderConfig,
  Scene,
} from "@storyplay/types";
import { VISION_SYSTEM_PROMPT, buildVisionUserPrompt } from "./prompts";
import { runAgent, visionContract } from "./agent-system";
import type { AgentContract } from "./agent-system";
import {
  fallbackVisionInterpretation,
  parseVisionOutput,
  type VisionAgentInput,
} from "./agent-system/agents/vision/parser";

export type VisionInterpretation = {
  intent: ClickIntent;
  classify: ReturnType<typeof fallbackVisionInterpretation>["classify"];
};

export async function interpret(
  config: ProviderConfig,
  annotatedImageBase64: string,
  scene: Scene | null,
  timeoutMs?: number,
): Promise<VisionInterpretation> {
  const result = await runAgent(
    {
      ...visionContract,
      fallback: fallbackVisionInterpretation,
    } as AgentContract<VisionAgentInput, VisionInterpretation>,
    { annotatedImageBase64, scene },
    async () => {
      const userPrompt = `${VISION_SYSTEM_PROMPT}\n\n${buildVisionUserPrompt(scene)}`;
      const raw = await interpretClick(
        config,
        annotatedImageBase64,
        userPrompt,
        timeoutMs,
      );

      return {
        raw,
        output: parseVisionOutput(raw),
      };
    },
  );

  return result.output;
}
