import type { BeatActiveCharacter, ProviderConfig } from "@storyplay/types";
import {
  cinematographerContract,
  runTextAgent,
} from "../agent-system";
import type { AgentContract } from "../agent-system";

// ──────────────────────────────────────────────────────────────────────
//  Cinematographer agent — translates the Writer's narrative scene
//  summary into an English compositional prompt for FLUX.
//
//  Reads: sceneSummary + entry beat's activeCharacters (poses)
//         + prior sceneKey (for continuity hints)
//  Writes: { shotType, integratedPrompt }
//
//  Does NOT describe character APPEARANCE — that's appended at the
//  Painter stage from session.characters[].visualDescription. The
//  Cinematographer only positions named characters in the frame and
//  describes the environment + lighting + camera framing.
//
//  This separation lets the Cinematographer run IN PARALLEL with the
//  CharacterDesigner — neither needs the other's output. They both
//  feed independently into the Painter prompt.
// ──────────────────────────────────────────────────────────────────────

export type CinematographerOutput = {
  shotType: string;
  integratedPrompt: string;
};

export type CinematographerInput = {
  sceneSummary: string;
  styleGuide: string;
  entryBeatActive: BeatActiveCharacter[];
  /** Entry beat's speaker — drives the dynamic camera policy:
   *    NPC name → NPC looks toward camera (close-up)
   *    "你"     → medium shot, NPC listens
   *    undefined → wide establishing shot */
  entryBeatSpeaker?: string;
  priorSceneKey?: string;
  currentSceneKey?: string;
};

export async function runCinematographer(
  config: ProviderConfig,
  input: CinematographerInput,
): Promise<CinematographerOutput> {
  const result = await runTextAgent(
    config,
    cinematographerContract as AgentContract<
      CinematographerInput,
      CinematographerOutput
    >,
    input,
    { temperature: 0.6, tag: "cinematographer" },
  );

  return result.output;
}
