import type {
  BeatActiveCharacter,
  Character,
  CharacterIntent,
  Orientation,
  Session,
} from "@storyplay/types";
import { parseJsonLoose } from "../jsonParser";
import {
  buildCharacterDesignerSystem,
  buildCharacterDesignerUserMessage,
  buildCinematographerUserMessage,
  buildPainterPrompt,
  buildWriterStreamMessages,
  CINEMATOGRAPHER_SYSTEM,
} from "../prompts";
import type {
  AgentContract,
  AgentRegistryEntry,
  AnyAgentContract,
  SchemaDescriptor,
} from "./types";
import {
  characterDesignerSkill,
  cinematographerSkill,
  freeformClassifierSkill,
  insertBeatSkill,
  painterSkill,
  styleSelectorSkill,
  visionSkill,
  voiceSkill,
  writerSkill,
} from "./skills";

function schema(name: string, description: string): SchemaDescriptor {
  return { name, description };
}

function contract<TInput = unknown, TOutput = unknown>(
  input: AgentContract<TInput, TOutput>,
): AgentContract<TInput, TOutput> {
  return input;
}

export type CinematographerAgentInput = {
  sceneSummary: string;
  styleGuide: string;
  entryBeatActive: BeatActiveCharacter[];
  entryBeatSpeaker?: string;
  priorSceneKey?: string;
  currentSceneKey?: string;
};

export type CinematographerAgentOutput = {
  shotType: string;
  integratedPrompt: string;
};

type RawCinematographerOutput = {
  shotType?: string;
  integratedPrompt?: string;
};

function fallbackCinematographerOutput(
  input: CinematographerAgentInput,
): CinematographerAgentOutput {
  return {
    shotType: "medium shot",
    integratedPrompt: `A cinematic illustration depicting: ${input.sceneSummary}. Wide establishing shot, natural lighting, atmospheric mood.`,
  };
}

function parseCinematographerOutput(
  raw: string,
  input: CinematographerAgentInput,
): CinematographerAgentOutput {
  const parsed = parseJsonLoose<RawCinematographerOutput>(raw);
  const fallback = fallbackCinematographerOutput(input);

  return {
    shotType: parsed.shotType?.trim() || fallback.shotType,
    integratedPrompt: parsed.integratedPrompt?.trim() || fallback.integratedPrompt,
  };
}

export type PainterAgentInput = {
  integratedPrompt: string;
  styleGuide: string;
  onStageCharacters: Character[];
  priorSceneImage?: string;
  styleReferenceImage?: string;
  orientation?: Orientation;
};

export type CharacterDesignerAgentInput = {
  session: Session;
  charName: string;
  intent?: CharacterIntent;
  stepfun: boolean;
};

export type CharacterDesignerAgentOutput = {
  visualDescription?: string;
  voiceDescription?: string;
  stepfunVoiceId?: string;
};

function parseCharacterDesignerOutput(
  raw: string,
  input: CharacterDesignerAgentInput,
): CharacterDesignerAgentOutput {
  try {
    const parsed = parseJsonLoose<unknown>(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as CharacterDesignerAgentOutput;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `[characterDesigner] design JSON parse failed for ${input.charName}: ${msg}`,
    );
    return {};
  }
}

export const writerContract = contract({
  id: "writer",
  name: "Writer",
  kind: "llm",
  modelRole: "text",
  inputSchema: schema("Session", "Full runtime Session used to generate the next scene."),
  outputSchema: schema("WriterTaggedStream", "<plan> JSON, <story> prose with memory, and <choices> JSON."),
  skill: writerSkill,
  buildMessages: (input) => buildWriterStreamMessages(input),
} satisfies AgentContract<Session, unknown>);

export const styleSelectorContract = contract({
  id: "style-selector",
  name: "StyleSelector",
  kind: "llm",
  modelRole: "text",
  inputSchema: schema("StyleSelectionInput", "Story premise and available STYLE_MAP names."),
  outputSchema: schema("StyleSelectionOutput", "A single style name that maps to STYLE_MAP."),
  skill: styleSelectorSkill,
});

export const characterDesignerContract = contract({
  id: "character-designer",
  name: "CharacterDesigner",
  kind: "llm",
  modelRole: "text",
  inputSchema: schema("CharacterDesignerInput", "Character name, session context, intent, existing cast, and provider mode."),
  outputSchema: schema("CharacterDesignerOutput", "Character card plus portrait and voice provisioning outputs."),
  skill: characterDesignerSkill,
  buildMessages: (input) => [
    {
      role: "system",
      content: buildCharacterDesignerSystem({ stepfun: input.stepfun }),
    },
    {
      role: "user",
      content: buildCharacterDesignerUserMessage(
        input.charName,
        input.session,
        input.intent,
      ),
    },
  ],
  parseOutput: parseCharacterDesignerOutput,
} satisfies AgentContract<CharacterDesignerAgentInput, CharacterDesignerAgentOutput>);

export const cinematographerContract = contract({
  id: "cinematographer",
  name: "Cinematographer",
  kind: "llm",
  modelRole: "text",
  inputSchema: schema("CinematographerInput", "Scene summary, style guide, entry characters, speaker, and sceneKey continuity."),
  outputSchema: schema("CinematographerOutput", "shotType and English integratedPrompt."),
  skill: cinematographerSkill,
  buildMessages: (input) => [
    { role: "system", content: CINEMATOGRAPHER_SYSTEM },
    {
      role: "user",
      content: buildCinematographerUserMessage(
        input.sceneSummary,
        input.styleGuide,
        input.entryBeatActive,
        input.entryBeatSpeaker,
        input.priorSceneKey,
        input.currentSceneKey,
      ),
    },
  ],
  parseOutput: parseCinematographerOutput,
} satisfies AgentContract<CinematographerAgentInput, CinematographerAgentOutput>);

export const painterContract = contract({
  id: "painter",
  name: "Painter",
  kind: "image",
  modelRole: "image",
  inputSchema: schema("PainterInput", "Integrated prompt, style, characters, references, and orientation."),
  outputSchema: schema("PainterResult", "Generated imageUrl and imageUuid or mock imageUrl."),
  skill: painterSkill,
  buildPrompt: (input) =>
    buildPainterPrompt(
      input.integratedPrompt,
      input.styleGuide,
      input.onStageCharacters,
      input.orientation,
    ),
} satisfies AgentContract<PainterAgentInput, unknown>);

export const visionContract = contract({
  id: "vision",
  name: "Vision",
  kind: "vision",
  modelRole: "vision",
  inputSchema: schema("VisionRequest", "Annotated image and current scene context."),
  outputSchema: schema("VisionResponse", "freeformAction, classify, and reasoning."),
  skill: visionSkill,
});

export const freeformClassifierContract = contract({
  id: "freeform-classifier",
  name: "FreeformClassifier",
  kind: "llm",
  modelRole: "text",
  inputSchema: schema("FreeformClassifyRequest", "Player freeform text and current scene prompt."),
  outputSchema: schema("FreeformClassifyResponse", "classify and normalized freeformAction."),
  skill: freeformClassifierSkill,
});

export const insertBeatContract = contract({
  id: "insert-beat",
  name: "InsertBeat",
  kind: "llm",
  modelRole: "text",
  inputSchema: schema("InsertBeatRequest", "Session and in-scene freeform action."),
  outputSchema: schema("InsertBeatResponse", "Partial beat and unchanged character registry."),
  skill: insertBeatSkill,
});

export const voiceContract = contract({
  id: "voice",
  name: "Voice / TTS",
  kind: "tts",
  modelRole: "tts",
  inputSchema: schema("BeatAudioRequest", "Beat text, character voice, voiceDescription, or stepfunVoiceId."),
  outputSchema: schema("BeatAudioResponse", "Audio payload or null."),
  skill: voiceSkill,
});

export const AGENT_CONTRACTS = [
  writerContract,
  styleSelectorContract,
  characterDesignerContract,
  cinematographerContract,
  painterContract,
  visionContract,
  freeformClassifierContract,
  insertBeatContract,
  voiceContract,
] as const satisfies readonly AnyAgentContract[];

export const AGENT_REGISTRY: readonly AgentRegistryEntry[] = AGENT_CONTRACTS.map((c) => ({
  id: c.id,
  name: c.name,
  kind: c.kind,
  modelRole: c.modelRole,
  skill: c.skill,
  contract: c,
}));
