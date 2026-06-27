import type { InsertBeatPartial } from "@storyplay/types";
import {
  normalizeSpeakerName,
  POV_DISPLAY_NAME,
} from "../../../agents/writer";
import { parseJsonLoose } from "../../../jsonParser";

const FALLBACK_NARRATION = "你停下脚步，重新观察眼前的场景。";

export function fallbackInsertBeatPartial(): InsertBeatPartial {
  return { narration: FALLBACK_NARRATION };
}

export function parseInsertBeatOutput(raw: string): InsertBeatPartial {
  const parsed = parseJsonLoose<InsertBeatPartial>(raw);

  const narration = parsed.narration?.trim() || undefined;
  const rawSpeaker = parsed.speaker?.trim() || undefined;
  const speaker = rawSpeaker ? normalizeSpeakerName(rawSpeaker) : undefined;
  const line = parsed.line?.trim() || undefined;
  const lineDelivery =
    line && speaker !== POV_DISPLAY_NAME
      ? parsed.lineDelivery?.trim() || undefined
      : undefined;

  if (!narration && !speaker && !line) {
    return fallbackInsertBeatPartial();
  }

  return { narration, speaker, line, lineDelivery };
}
