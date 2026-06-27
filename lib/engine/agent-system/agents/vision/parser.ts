import type { Scene, VisionClassify } from "@storyplay/types";
import { parseJsonLoose } from "../../../jsonParser";

export type VisionAgentInput = {
  annotatedImageBase64: string;
  scene: Scene | null;
};

export type VisionInterpretation = {
  intent: {
    freeformAction: string;
    reasoning: string;
  };
  classify: VisionClassify;
};

type RawVisionOutput = {
  freeformAction?: string;
  classify?: string;
  reasoning?: string;
};

const FALLBACK_ACTION = "玩家点击了场景，但意图不明确。";
const FALLBACK_REASONING = "视觉理解失败，已降级为场内探索。";

export function fallbackVisionInterpretation(): VisionInterpretation {
  return {
    intent: {
      freeformAction: FALLBACK_ACTION,
      reasoning: FALLBACK_REASONING,
    },
    classify: "insert-beat",
  };
}

export function parseVisionOutput(raw: string): VisionInterpretation {
  const parsed = parseJsonLoose<RawVisionOutput>(raw);
  const classify: VisionClassify =
    parsed.classify === "change-scene" ? "change-scene" : "insert-beat";

  return {
    intent: {
      freeformAction: parsed.freeformAction?.trim() || FALLBACK_ACTION,
      reasoning: parsed.reasoning?.trim() || "",
    },
    classify,
  };
}
