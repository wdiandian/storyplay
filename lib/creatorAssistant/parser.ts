import { parseJsonLoose } from "@/lib/engine/jsonParser";
import type {
  CreatorStoryAssistantPatchNote,
  CreatorStoryAssistantOutput,
  CreatorStoryAssistantSuggestion,
  CreatorStoryAssistantTargetSection,
  StoryProjectPatch,
} from "./types";
import { filterCreatorAssistantPatchForSkill } from "./skillPatchFilter";

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function stringArray(value: unknown, limit = 12) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function cleanSuggestion(value: unknown): CreatorStoryAssistantSuggestion | undefined {
  const item = objectValue(value);
  const severity = item.severity === "critical" || item.severity === "warning" ? item.severity : "info";
  const field = stringValue(item.field);
  const message = stringValue(item.message);
  if (!field || !message) return undefined;
  return { severity, field, message };
}

function cleanCharacterPatch(value: unknown): NonNullable<StoryProjectPatch["characters"]>[number] {
  const item = objectValue(value);
  const clean: NonNullable<StoryProjectPatch["characters"]>[number] = {};
  const id = stringValue(item.id);
  const name = stringValue(item.name);
  const persona = stringValue(item.persona);
  const relationshipToPlayer = stringValue(item.relationshipToPlayer);
  const visualNotes = stringValue(item.visualNotes);
  const voiceNotes = stringValue(item.voiceNotes);
  const referenceImagePrompt = stringValue(item.referenceImagePrompt);
  if (id) clean.id = id;
  if (name) clean.name = name;
  if (
    item.role === "protagonist" ||
    item.role === "main" ||
    item.role === "supporting" ||
    item.role === "temporary"
  ) {
    clean.role = item.role;
  }
  if (persona) clean.persona = persona;
  if (relationshipToPlayer) clean.relationshipToPlayer = relationshipToPlayer;
  if (visualNotes) clean.visualNotes = visualNotes;
  if (voiceNotes) clean.voiceNotes = voiceNotes;
  if (referenceImagePrompt) clean.referenceImagePrompt = referenceImagePrompt;
  if (typeof item.locked === "boolean") clean.locked = item.locked;
  return clean;
}

function cleanAssetPatch(value: unknown): NonNullable<StoryProjectPatch["assets"]>[number] {
  const item = objectValue(value);
  const clean: NonNullable<StoryProjectPatch["assets"]>[number] = {};
  const id = stringValue(item.id);
  const title = stringValue(item.title);
  const prompt = stringValue(item.prompt);
  const characterId = stringValue(item.characterId);
  const notes = stringValue(item.notes);
  if (id) clean.id = id;
  if (
    item.kind === "cover" ||
    item.kind === "first-scene" ||
    item.kind === "character-reference" ||
    item.kind === "style-reference" ||
    item.kind === "runtime-scene"
  ) {
    clean.kind = item.kind;
  }
  if (title) clean.title = title;
  if (prompt) clean.prompt = prompt;
  if (characterId) clean.characterId = characterId;
  if (notes) clean.notes = notes;
  return clean;
}

function cleanStringObject<T extends string>(
  value: unknown,
  keys: readonly T[],
): Partial<Record<T, string>> {
  const item = objectValue(value);
  const clean: Partial<Record<T, string>> = {};
  for (const key of keys) {
    const next = stringValue(item[key]);
    if (next) clean[key] = next;
  }
  return clean;
}

function cleanNarrativePatch(value: unknown): NonNullable<StoryProjectPatch["narrative"]> {
  const item = objectValue(value);
  const clean: NonNullable<StoryProjectPatch["narrative"]> = cleanStringObject(item, [
    "protagonist",
    "coreConflict",
    "chapterGoals",
    "creatorNotes",
  ] as const);
  const keyMysteries = stringArray(item.keyMysteries);
  if (keyMysteries.length > 0) clean.keyMysteries = keyMysteries;
  return clean;
}

function cleanStoryOutlinePatch(value: unknown): NonNullable<StoryProjectPatch["storyOutline"]> {
  const item = objectValue(value);
  const clean: NonNullable<StoryProjectPatch["storyOutline"]> = cleanStringObject(item, [
    "mainGoal",
    "phaseOutline",
    "relationshipArc",
    "supportingCast",
    "endingDirection",
  ] as const);
  const requiredBeats = stringArray(item.requiredBeats);
  const guardrails = stringArray(item.guardrails);
  if (requiredBeats.length > 0) clean.requiredBeats = requiredBeats;
  if (guardrails.length > 0) clean.guardrails = guardrails;
  return clean;
}

function cleanInteractionPatch(value: unknown): NonNullable<StoryProjectPatch["interaction"]> {
  const item = objectValue(value);
  const clean: NonNullable<StoryProjectPatch["interaction"]> = {};
  if (item.intensity === "light" || item.intensity === "medium" || item.intensity === "strong") {
    clean.intensity = item.intensity;
  }
  if (item.playMode === "read-heavy" || item.playMode === "choice-driven" || item.playMode === "free-explore") {
    clean.playMode = item.playMode;
  }
  if (item.choiceDensity === "low" || item.choiceDensity === "medium" || item.choiceDensity === "high") {
    clean.choiceDensity = item.choiceDensity;
  }
  if (
    item.branchingMode === "convergent" ||
    item.branchingMode === "short-branch" ||
    item.branchingMode === "multi-ending"
  ) {
    clean.branchingMode = item.branchingMode;
  }
  if (typeof item.freeformInput === "boolean") clean.freeformInput = item.freeformInput;
  if (
    item.freeformInputMode === "off" ||
    item.freeformInputMode === "playtest-only" ||
    item.freeformInputMode === "always"
  ) {
    clean.freeformInputMode = item.freeformInputMode;
  }
  if (
    item.visualGenerationMode === "first-scene-only" ||
    item.visualGenerationMode === "key-scenes" ||
    item.visualGenerationMode === "every-scene"
  ) {
    clean.visualGenerationMode = item.visualGenerationMode;
  }
  const choiceStyle = stringValue(item.choiceStyle);
  const branchNotes = stringValue(item.branchNotes);
  if (choiceStyle) clean.choiceStyle = choiceStyle;
  if (branchNotes) clean.branchNotes = branchNotes;
  return clean;
}

function cleanPatch(rawPatch: unknown): StoryProjectPatch {
  const patch = objectValue(rawPatch);
  const clean: StoryProjectPatch = {};

  for (const key of ["title", "logline", "synopsis"] as const) {
    const value = stringValue(patch[key]);
    if (value) clean[key] = value;
  }

  if (patch.audience === "male" || patch.audience === "female" || patch.audience === "universal") {
    clean.audience = patch.audience;
  }

  for (const key of ["genres", "moods", "tags"] as const) {
    const values = stringArray(patch[key]);
    if (values.length > 0) clean[key] = values;
  }

  const world = cleanStringObject(patch.world, ["setting", "rules", "tone", "locations"] as const);
  if (Object.keys(world).length > 0) clean.world = world;

  const narrative = cleanNarrativePatch(patch.narrative);
  if (Object.keys(narrative).length > 0) clean.narrative = narrative;

  const storyOutline = cleanStoryOutlinePatch(patch.storyOutline);
  if (Object.keys(storyOutline).length > 0) clean.storyOutline = storyOutline;

  const interaction = cleanInteractionPatch(patch.interaction);
  if (Object.keys(interaction).length > 0) clean.interaction = interaction;

  const visual = cleanStringObject(patch.visual, ["stylePrompt"] as const);
  if (Object.keys(visual).length > 0) clean.visual = visual;

  const runtimePolicyRaw = objectValue(patch.runtimePolicy);
  const runtimePolicy: NonNullable<StoryProjectPatch["runtimePolicy"]> = {};
  if (runtimePolicyRaw.orientation === "portrait" || runtimePolicyRaw.orientation === "landscape") {
    runtimePolicy.orientation = runtimePolicyRaw.orientation;
  }
  const styleGuide = stringValue(runtimePolicyRaw.styleGuide);
  if (styleGuide) runtimePolicy.styleGuide = styleGuide;
  if (Object.keys(runtimePolicy).length > 0) clean.runtimePolicy = runtimePolicy;

  const structure = objectValue(patch.structure);
  if (Array.isArray(structure.acts) || stringValue(structure.selectedActId) || stringValue(structure.selectedSceneId)) {
    clean.structure = {
      acts: Array.isArray(structure.acts) ? structure.acts.map((act) => objectValue(act)) : undefined,
      selectedActId: stringValue(structure.selectedActId) || undefined,
      selectedSceneId: stringValue(structure.selectedSceneId) || undefined,
    };
  }

  if (Array.isArray(patch.characters)) {
    clean.characters = patch.characters.map(cleanCharacterPatch);
  }

  if (Array.isArray(patch.assets)) {
    clean.assets = patch.assets.map(cleanAssetPatch);
  }

  return clean;
}

export function fallbackCreatorStoryAssistantOutput(reason: string): CreatorStoryAssistantOutput {
  return {
    summary: "助手暂时无法生成稳定的结构化结果。",
    suggestions: [
      {
        severity: "warning",
        field: "assistant",
        message: reason,
      },
    ],
    patch: {},
    patchNotes: [],
    nextActions: ["检查模型配置后重试", "也可以先手动补充故事简介、主线目标和关键角色"],
  };
}

export function parseCreatorStoryAssistantOutput(
  raw: string,
  options: { targetSection?: CreatorStoryAssistantTargetSection } = {},
): CreatorStoryAssistantOutput {
  try {
    const parsedRaw = parseJsonLoose<unknown>(raw);
    if (!isObjectRecord(parsedRaw)) {
      throw new Error("模型输出不是对象结构");
    }
    const parsed = parsedRaw;
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.map(cleanSuggestion).filter(isDefined)
      : [];
    const patchNotes = Array.isArray(parsed.patchNotes)
      ? parsed.patchNotes
          .map((note): CreatorStoryAssistantPatchNote | undefined => {
            const item = objectValue(note);
            const field = stringValue(item.field);
            const reason = stringValue(item.reason);
            if (!field || !reason) return undefined;
            return {
              field,
              before: stringValue(item.before) || undefined,
              after: stringValue(item.after) || undefined,
              reason,
            };
          })
          .filter(isDefined)
      : [];

    return {
      summary: stringValue(parsed.summary, "已生成创作建议。"),
      suggestions,
      patch: filterCreatorAssistantPatchForSkill(cleanPatch(parsed.patch), options.targetSection),
      patchNotes,
      nextActions: stringArray(parsed.nextActions, 6),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "模型输出无法解析";
    return fallbackCreatorStoryAssistantOutput(message);
  }
}
