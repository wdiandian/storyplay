import { parseJsonLoose } from "@/lib/engine/jsonParser";
import type {
  CreatorStoryAssistantPatchNote,
  CreatorStoryAssistantOutput,
  CreatorStoryAssistantSuggestion,
  StoryProjectPatch,
} from "./types";

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

  for (const key of ["world", "narrative", "storyOutline", "interaction", "visual", "runtimePolicy"] as const) {
    const value = objectValue(patch[key]);
    if (Object.keys(value).length > 0) {
      clean[key] = value as never;
    }
  }

  const structure = objectValue(patch.structure);
  if (Array.isArray(structure.acts) || stringValue(structure.selectedActId) || stringValue(structure.selectedSceneId)) {
    clean.structure = {
      acts: Array.isArray(structure.acts) ? structure.acts.map((act) => objectValue(act)) : undefined,
      selectedActId: stringValue(structure.selectedActId) || undefined,
      selectedSceneId: stringValue(structure.selectedSceneId) || undefined,
    };
  }

  if (Array.isArray(patch.characters)) {
    clean.characters = patch.characters.map((character) => objectValue(character));
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

export function parseCreatorStoryAssistantOutput(raw: string): CreatorStoryAssistantOutput {
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
      patch: cleanPatch(parsed.patch),
      patchNotes,
      nextActions: stringArray(parsed.nextActions, 6),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "模型输出无法解析";
    return fallbackCreatorStoryAssistantOutput(message);
  }
}
