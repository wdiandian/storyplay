import { generateImage } from "@storyplay/ai-client";
import {
  isStepfun,
  isValidStepfunVoiceId,
  provisionVoice,
  type ProvisionVoiceOptions,
} from "@storyplay/tts-client";
import type {
  Character,
  CharacterIntent,
  CharacterVoice,
  EngineConfig,
  ProviderConfig,
  Session,
} from "@storyplay/types";
import {
  characterDesignerContract,
  runAgent,
  runTextAgent,
} from "../agent-system";
import type { AgentContract } from "../agent-system";
import { mockImageDataUri } from "../mockImage";
import {
  buildCharacterPortraitPrompt,
} from "../prompts";

// ──────────────────────────────────────────────────────────────────────
//  CharacterDesigner agent — designs ONE new character.
//
//  Exposed as three GRANULAR stages so the director can schedule the slow
//  parts around the Painter (a voice is never needed to paint a scene, and
//  only entry-beat characters' portraits are referenced by the Painter):
//
//    1. designCharacterCard      — ONE LLM call → visual + voice TEXT cards
//       (intentional bundling: the same agent thinks about who this character
//        IS, keeping appearance and vocal personality coherent)
//    2. renderCharacterPortrait  — base portrait image (Runware URL + UUID)
//    3. provisionCharacterVoice  — Xiaomi MiMo voicedesign → reference audio
//
//  Each step degrades gracefully — if image gen fails the character just has
//  no portrait; if voice gen fails it has no voice. The game keeps running.
// ──────────────────────────────────────────────────────────────────────

type CharacterDesignOutput = {
  visualDescription?: string;
  voiceDescription?: string;
  /** Only present on the StepFun path (the system prompt asks for it when
   *  stepfun:true). Hallucinated / out-of-catalog ids are dropped before
   *  they reach provisioning, falling back to pickStepfunVoiceId. */
  stepfunVoiceId?: string;
};

// TEMP: per-phase timing for latency diagnosis. Same convention as the
// orchestrator's tlog. Remove after we have data on real-world numbers.
function tlog(label: string, t0: number): void {
  console.log(`${label}: ${Date.now() - t0}ms`);
}

async function runDesignLLM(
  config: EngineConfig,
  session: Session,
  charName: string,
  intent?: CharacterIntent,
  textConfig: ProviderConfig = config.text,
): Promise<CharacterDesignOutput> {
  const result = await runTextAgent(
    textConfig,
    characterDesignerContract as AgentContract<
      {
        session: Session;
        charName: string;
        intent?: CharacterIntent;
        stepfun: boolean;
      },
      CharacterDesignOutput
    >,
    {
      session,
      charName,
      intent,
      stepfun: stepfunEnabled(config),
    },
    { temperature: 0.7, tag: "character-designer" },
  );

  return result.output;
}

/** True when the server's TTS config points at StepFun (so the CharacterDesigner
 *  should also pick a preset voice id). Returns false when TTS is off or on the
 *  Xiaomi path — keeping the Xiaomi prompt byte-identical to history. */
function stepfunEnabled(config: EngineConfig): boolean {
  return !!config.tts && isStepfun(config.tts);
}

async function renderPortraitImage(
  config: EngineConfig,
  charName: string,
  visualDescription: string,
  styleGuide: string,
): Promise<{ basePortraitUrl?: string; basePortraitUuid?: string }> {
  if (config.mockImage) {
    return { basePortraitUrl: await mockImageDataUri() };
  }
  const prompt = buildCharacterPortraitPrompt(
    charName,
    visualDescription,
    styleGuide,
  );
  // Portraits get the hard timeout but are never hedged: a scene already runs
  // several portrait paints in parallel, so hedging would multiply concurrency.
  const { imageUrl, imageUuid } = await generateImage(config.image, prompt, {
    timeoutMs: config.imageTimeoutMs,
  });
  return { basePortraitUrl: imageUrl, basePortraitUuid: imageUuid };
}

async function resolveCharacterVoice(
  config: EngineConfig,
  voiceDescription: string,
  charName: string,
  opts?: ProvisionVoiceOptions,
): Promise<CharacterVoice | undefined> {
  if (!config.tts) return undefined;
  return provisionVoice(config.tts, voiceDescription, charName, opts);
}

async function runPortraitStage(
  config: EngineConfig,
  charName: string,
  visualDescription: string,
  styleGuide: string,
): Promise<{ basePortraitUrl?: string; basePortraitUuid?: string }> {
  const result = await runAgent(
    {
      ...characterDesignerContract,
      kind: "image",
      modelRole: "image",
    } as AgentContract<
      {
        charName: string;
        visualDescription: string;
        styleGuide: string;
      },
      { basePortraitUrl?: string; basePortraitUuid?: string }
    >,
    { charName, visualDescription, styleGuide },
    async () => ({
      output: await renderPortraitImage(
        config,
        charName,
        visualDescription,
        styleGuide,
      ),
    }),
  );
  return result.output;
}

async function runVoiceResolverStage(
  config: EngineConfig,
  voiceDescription: string,
  charName: string,
  opts?: ProvisionVoiceOptions,
): Promise<CharacterVoice | undefined> {
  const result = await runAgent(
    {
      ...characterDesignerContract,
      kind: "tts",
      modelRole: "tts",
    } as AgentContract<
      {
        voiceDescription: string;
        charName: string;
        opts?: ProvisionVoiceOptions;
      },
      CharacterVoice | undefined
    >,
    { voiceDescription, charName, opts },
    async () => ({
      output: await resolveCharacterVoice(config, voiceDescription, charName, opts),
    }),
  );
  return result.output;
}

// Generate the per-character base portrait. The portrait is a "concept
// sheet" — single character, neutral pose, plain background — so it works
// well as a Runware referenceImages anchor for later scenes.
//
// Returns the URL (for any client display + URL-form references) and the
// UUID (cheapest reference form for subsequent Painter calls). Both come
// back in one `imageInference` response now that we use outputType=URL —
// no separate upload step needed.
//
// In mock mode we return the data URI as basePortraitUrl with no UUID
// (Painter is short-circuited anyway, so the lack of a UUID is moot).
export async function renderCharacterPortrait(
  config: EngineConfig,
  charName: string,
  visualDescription: string,
  styleGuide: string,
): Promise<{ basePortraitUrl?: string; basePortraitUuid?: string }> {
  try {
    return await runPortraitStage(config, charName, visualDescription, styleGuide);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[characterDesigner] portrait gen failed for ${charName}: ${msg}`);
    return {};
  }
}

async function _renderCharacterPortraitLegacy(
  config: EngineConfig,
  charName: string,
  visualDescription: string,
  styleGuide: string,
): Promise<{ basePortraitUrl?: string; basePortraitUuid?: string }> {
  try {
    if (config.mockImage) {
      return { basePortraitUrl: await mockImageDataUri() };
    }
    const prompt = buildCharacterPortraitPrompt(
      charName,
      visualDescription,
      styleGuide,
    );
    // Portraits get the hard timeout but are never hedged — a scene already
    // runs several portrait paints in parallel, and hedging those would push
    // burst concurrency past Runware's recommended 2-4 in-flight requests.
    const { imageUrl, imageUuid } = await generateImage(config.image, prompt, {
      timeoutMs: config.imageTimeoutMs,
    });
    return { basePortraitUrl: imageUrl, basePortraitUuid: imageUuid };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[characterDesigner] portrait gen failed for ${charName}: ${msg}`);
    return {}; // no portrait at all — degrade gracefully
  }
}

export async function provisionCharacterVoice(
  config: EngineConfig,
  voiceDescription: string,
  charName: string,
  opts?: ProvisionVoiceOptions,
): Promise<CharacterVoice | undefined> {
  if (!config.tts) return undefined;
  try {
    return await runVoiceResolverStage(config, voiceDescription, charName, opts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[characterDesigner] voice provision failed for ${charName}: ${msg}`);
    return undefined;
  }
}

// The cheap first stage: design the visual + voice TEXT cards in one LLM
// call. The director then schedules renderCharacterPortrait /
// provisionCharacterVoice around the Painter. Multiple new characters in the
// same scene run this stage in parallel at the director level.
//
// On the StepFun path the same call ALSO yields stepfunVoiceId (the model
// picks from the 32-preset catalog it sees in the system prompt). An invalid
// pick is dropped here so the downstream provision falls back to the keyword
// scorer — never trust an LLM-hallucinated id at the synth boundary.
export type CharacterCard = {
  name: string;
  visualDescription?: string;
  voiceDescription: string;
  /** Only set on the StepFun path AND only when the LLM picked a valid catalog
   *  id. Threads through provisionCharacterVoice → stepfunProvision. */
  stepfunVoiceId?: string;
};

export async function designCharacterCard(
  config: EngineConfig,
  session: Session,
  charName: string,
  intent?: CharacterIntent,
  textConfig?: ProviderConfig,
): Promise<CharacterCard> {
  const tDesign = Date.now();
  const design = await runDesignLLM(config, session, charName, intent, textConfig);
  tlog(`[charDesigner ${charName}] design LLM`, tDesign);

  // Drop invalid catalog picks before they reach provision/synth. A hallucinated
  // id would 4xx at synth time; better to fall back to pickStepfunVoiceId now.
  const stepfunVoiceId = isValidStepfunVoiceId(design.stepfunVoiceId)
    ? design.stepfunVoiceId
    : undefined;

  return {
    name: charName,
    visualDescription: design.visualDescription?.trim() || undefined,
    voiceDescription:
      design.voiceDescription?.trim() ||
      `请根据角色名「${charName}」推断其性别、年龄与气质，生成最贴合的音色。所属世界观：${session.worldSetting}`,
    stepfunVoiceId,
  };
}

// Provision voice ONLY for an existing character that the LLM mentioned
// without us having designed them yet (e.g., 编剧 referenced a name that
// wasn't in `activeCharacters` but appeared as a speaker). Used by
// directInsertBeat path and as a safety net in directScene. No portrait
// is generated for these — they get a name + voice only.
export async function provisionVoiceForName(
  config: EngineConfig,
  session: Session,
  charName: string,
): Promise<Character> {
  const voiceDescription = `请根据角色名「${charName}」推断其性别、年龄与气质，生成最贴合的音色。所属世界观：${session.worldSetting}`;
  const voice = await provisionCharacterVoice(config, voiceDescription, charName);
  return { name: charName, voiceDescription, voice };
}
