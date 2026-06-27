import type {
  FreeformClassify,
  FreeformClassifyRequest,
  FreeformClassifyResponse,
} from "@storyplay/types";
import { parseJsonLoose } from "../../../jsonParser";

type RawFreeformClassifyOutput = {
  classify?: string;
  freeformAction?: string;
};

export function fallbackFreeformClassify(
  input: FreeformClassifyRequest,
): FreeformClassifyResponse {
  return {
    classify: "insert-beat",
    freeformAction: input.freeformText,
  };
}

export function parseFreeformClassifyOutput(
  raw: string,
  input: FreeformClassifyRequest,
): FreeformClassifyResponse {
  const parsed = parseJsonLoose<RawFreeformClassifyOutput>(raw);
  const classify: FreeformClassify =
    parsed.classify === "change-scene" ? "change-scene" : "insert-beat";

  return {
    classify,
    freeformAction: parsed.freeformAction?.trim() || input.freeformText,
  };
}

