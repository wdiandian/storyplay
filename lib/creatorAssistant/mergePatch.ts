import {
  createStoryProjectAct,
  createStoryProjectAsset,
  createStoryProjectCharacter,
  createStoryProjectScene,
  normalizeStoryProject,
  type StoryProject,
  type StoryProjectAct,
  type StoryProjectAsset,
  type StoryProjectCharacter,
  type StoryProjectScene,
} from "@/lib/storyProject/types";
import type {
  CreatorStoryAssistantActPatch,
  CreatorStoryAssistantAssetPatch,
  CreatorStoryAssistantCharacterPatch,
  CreatorStoryAssistantScenePatch,
  StoryProjectPatch,
} from "./types";

function hasOwn<T extends object, K extends PropertyKey>(value: T, key: K): value is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function stringPatch(value: unknown, fallback: string) {
  return typeof value === "string" ? value.trim() : fallback;
}

function stringArrayPatch(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return cleaned.length > 0 ? cleaned : fallback;
}

function mergeScene(current: StoryProjectScene | undefined, patch: CreatorStoryAssistantScenePatch): StoryProjectScene {
  const base = current ?? createStoryProjectScene({ source: "ai-generated" });
  return createStoryProjectScene({
    ...base,
    id: base.id,
    title: stringPatch(patch.title, base.title),
    location: stringPatch(patch.location, base.location),
    characters: stringArrayPatch(patch.characters, base.characters),
    purpose: stringPatch(patch.purpose, base.purpose),
    openingEvent: stringPatch(patch.openingEvent, base.openingEvent),
    playerChoices: stringArrayPatch(patch.playerChoices, base.playerChoices),
    emotionalBeat: stringPatch(patch.emotionalBeat, base.emotionalBeat),
    notes: stringPatch(patch.notes, base.notes),
    lastPlaytest: base.lastPlaytest,
    source: current?.source ?? "ai-generated",
  });
}

function mergeAct(current: StoryProjectAct | undefined, patch: CreatorStoryAssistantActPatch): StoryProjectAct {
  const base = current ?? createStoryProjectAct({ source: "ai-generated" });
  const incomingScenes = Array.isArray(patch.scenes) ? patch.scenes : [];
  const scenes = incomingScenes.length > 0
    ? incomingScenes.map((scenePatch, index) => {
        const existing = scenePatch.id
          ? base.scenes.find((scene) => scene.id === scenePatch.id)
          : base.scenes[index];
        return mergeScene(existing, scenePatch);
      })
    : base.scenes;

  return createStoryProjectAct({
    ...base,
    id: base.id,
    title: stringPatch(patch.title, base.title),
    goal: stringPatch(patch.goal, base.goal),
    conflict: stringPatch(patch.conflict, base.conflict),
    pacing: stringPatch(patch.pacing, base.pacing),
    notes: stringPatch(patch.notes, base.notes),
    scenes,
    source: current?.source ?? "ai-generated",
  });
}

function mergeCharacters(
  currentCharacters: StoryProjectCharacter[],
  incomingCharacters: CreatorStoryAssistantCharacterPatch[] | undefined,
): StoryProjectCharacter[] {
  if (!incomingCharacters || incomingCharacters.length === 0) return currentCharacters;

  const merged = [...currentCharacters];
  for (const patch of incomingCharacters) {
    const existingIndex = merged.findIndex((character) =>
      (patch.id && character.id === patch.id) ||
      (!!patch.name && character.name.trim().toLowerCase() === patch.name.trim().toLowerCase())
    );
    const existing = existingIndex >= 0 ? merged[existingIndex] : undefined;
    if (existing?.locked) continue;

    const next = createStoryProjectCharacter({
      ...existing,
      id: existing?.id,
      name: stringPatch(patch.name, existing?.name ?? ""),
      role:
        patch.role === "protagonist" ||
        patch.role === "main" ||
        patch.role === "supporting" ||
        patch.role === "temporary"
          ? patch.role
          : existing?.role ?? "main",
      persona: stringPatch(patch.persona, existing?.persona ?? ""),
      relationshipToPlayer: stringPatch(patch.relationshipToPlayer, existing?.relationshipToPlayer ?? ""),
      visualNotes: stringPatch(patch.visualNotes, existing?.visualNotes ?? ""),
      voiceNotes: stringPatch(patch.voiceNotes, existing?.voiceNotes ?? ""),
      referenceImageUrl: stringPatch(patch.referenceImageUrl, existing?.referenceImageUrl ?? ""),
      referenceImagePrompt: stringPatch(patch.referenceImagePrompt, existing?.referenceImagePrompt ?? ""),
      referenceImageSource: existing?.referenceImageSource ?? "ai-generated",
      referenceImageStatus:
        patch.referenceImageStatus === "empty" ||
        patch.referenceImageStatus === "generating" ||
        patch.referenceImageStatus === "ready" ||
        patch.referenceImageStatus === "failed"
          ? patch.referenceImageStatus
          : existing?.referenceImageStatus,
      source: existing?.source ?? "ai-generated",
      locked: patch.locked ?? existing?.locked ?? false,
    });

    if (!next.name) continue;
    if (existingIndex >= 0) {
      merged[existingIndex] = next;
    } else {
      merged.push(next);
    }
  }

  return merged;
}

function mergeAssets(
  currentAssets: StoryProjectAsset[],
  incomingAssets: CreatorStoryAssistantAssetPatch[] | undefined,
): StoryProjectAsset[] {
  if (!incomingAssets || incomingAssets.length === 0) return currentAssets;

  const merged = [...currentAssets];
  for (const patch of incomingAssets) {
    const existingIndex = merged.findIndex((asset) =>
      (patch.id && asset.id === patch.id) ||
      (!!patch.kind && asset.kind === patch.kind && (patch.characterId ?? "") === asset.characterId)
    );
    const existing = existingIndex >= 0 ? merged[existingIndex] : undefined;
    const next = createStoryProjectAsset({
      ...existing,
      id: existing?.id,
      kind: patch.kind ?? existing?.kind,
      title: stringPatch(patch.title, existing?.title ?? ""),
      url: existing?.url ?? "",
      prompt: stringPatch(patch.prompt, existing?.prompt ?? ""),
      source: existing?.source ?? patch.source ?? "ai-generated",
      status: existing?.status,
      characterId: stringPatch(patch.characterId, existing?.characterId ?? ""),
      provider: existing?.provider ?? "",
      model: existing?.model ?? "",
      notes: stringPatch(patch.notes, existing?.notes ?? ""),
    });

    if (existingIndex >= 0) {
      merged[existingIndex] = next;
    } else {
      merged.push(next);
    }
  }

  return merged;
}

export function hasCreatorStoryAssistantPatch(patch: StoryProjectPatch | undefined) {
  if (!patch) return false;
  return Object.keys(patch).some((key) => {
    const value = patch[key as keyof StoryProjectPatch];
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === "object") return Object.keys(value).length > 0;
    return value !== undefined && value !== "";
  });
}

export function mergeCreatorStoryAssistantPatch(
  project: StoryProject,
  patch: StoryProjectPatch,
): StoryProject {
  const next: StoryProject = {
    ...project,
    title: stringPatch(patch.title, project.title),
    logline: stringPatch(patch.logline, project.logline),
    synopsis: stringPatch(patch.synopsis, project.synopsis),
    audience:
      patch.audience === "male" || patch.audience === "female" || patch.audience === "universal"
        ? patch.audience
        : project.audience,
    genres: stringArrayPatch(patch.genres, project.genres),
    moods: stringArrayPatch(patch.moods, project.moods),
    tags: stringArrayPatch(patch.tags, project.tags),
    world: {
      ...project.world,
      setting: stringPatch(patch.world?.setting, project.world.setting),
      rules: stringPatch(patch.world?.rules, project.world.rules),
      tone: stringPatch(patch.world?.tone, project.world.tone),
      locations: stringPatch(patch.world?.locations, project.world.locations),
    },
    narrative: {
      ...project.narrative,
      protagonist: stringPatch(patch.narrative?.protagonist, project.narrative.protagonist),
      coreConflict: stringPatch(patch.narrative?.coreConflict, project.narrative.coreConflict),
      keyMysteries: stringArrayPatch(patch.narrative?.keyMysteries, project.narrative.keyMysteries),
      chapterGoals: stringPatch(patch.narrative?.chapterGoals, project.narrative.chapterGoals),
      creatorNotes: stringPatch(patch.narrative?.creatorNotes, project.narrative.creatorNotes),
    },
    storyOutline: {
      ...project.storyOutline,
      mainGoal: stringPatch(patch.storyOutline?.mainGoal, project.storyOutline.mainGoal),
      phaseOutline: stringPatch(patch.storyOutline?.phaseOutline, project.storyOutline.phaseOutline),
      requiredBeats: stringArrayPatch(patch.storyOutline?.requiredBeats, project.storyOutline.requiredBeats),
      relationshipArc: stringPatch(patch.storyOutline?.relationshipArc, project.storyOutline.relationshipArc),
      supportingCast: stringPatch(patch.storyOutline?.supportingCast, project.storyOutline.supportingCast),
      endingDirection: stringPatch(patch.storyOutline?.endingDirection, project.storyOutline.endingDirection),
      guardrails: stringArrayPatch(patch.storyOutline?.guardrails, project.storyOutline.guardrails),
    },
    characters: mergeCharacters(project.characters, patch.characters),
    assets: mergeAssets(project.assets, patch.assets),
    interaction: {
      ...project.interaction,
      intensity:
        patch.interaction?.intensity === "light" ||
        patch.interaction?.intensity === "medium" ||
        patch.interaction?.intensity === "strong"
          ? patch.interaction.intensity
          : project.interaction.intensity,
      playMode:
        patch.interaction?.playMode === "read-heavy" ||
        patch.interaction?.playMode === "choice-driven" ||
        patch.interaction?.playMode === "free-explore"
          ? patch.interaction.playMode
          : project.interaction.playMode,
      choiceDensity:
        patch.interaction?.choiceDensity === "low" ||
        patch.interaction?.choiceDensity === "medium" ||
        patch.interaction?.choiceDensity === "high"
          ? patch.interaction.choiceDensity
          : project.interaction.choiceDensity,
      branchingMode:
        patch.interaction?.branchingMode === "convergent" ||
        patch.interaction?.branchingMode === "short-branch" ||
        patch.interaction?.branchingMode === "multi-ending"
          ? patch.interaction.branchingMode
          : project.interaction.branchingMode,
      choiceStyle: stringPatch(patch.interaction?.choiceStyle, project.interaction.choiceStyle),
      branchNotes: stringPatch(patch.interaction?.branchNotes, project.interaction.branchNotes),
      freeformInput: hasOwn(patch.interaction ?? {}, "freeformInput")
        ? Boolean(patch.interaction?.freeformInput)
        : project.interaction.freeformInput,
      freeformInputMode:
        patch.interaction?.freeformInputMode === "off" ||
        patch.interaction?.freeformInputMode === "playtest-only" ||
        patch.interaction?.freeformInputMode === "always"
          ? patch.interaction.freeformInputMode
          : project.interaction.freeformInputMode,
      visualGenerationMode:
        patch.interaction?.visualGenerationMode === "first-scene-only" ||
        patch.interaction?.visualGenerationMode === "key-scenes" ||
        patch.interaction?.visualGenerationMode === "every-scene"
          ? patch.interaction.visualGenerationMode
          : project.interaction.visualGenerationMode,
    },
    visual: {
      ...project.visual,
      stylePrompt: stringPatch(patch.visual?.stylePrompt, project.visual.stylePrompt),
      cover: stringPatch(patch.visual?.cover, project.visual.cover),
      firstScene: stringPatch(patch.visual?.firstScene, project.visual.firstScene),
    },
    runtimePolicy: {
      ...project.runtimePolicy,
      orientation:
        patch.runtimePolicy?.orientation === "landscape" || patch.runtimePolicy?.orientation === "portrait"
          ? patch.runtimePolicy.orientation
          : project.runtimePolicy.orientation,
      styleGuide: stringPatch(patch.runtimePolicy?.styleGuide, project.runtimePolicy.styleGuide),
    },
  };

  if (patch.structure?.acts && patch.structure.acts.length > 0) {
    const acts = patch.structure.acts.map((actPatch, index) => {
      const existing = actPatch.id
        ? project.structure.acts.find((act) => act.id === actPatch.id)
        : project.structure.acts[index];
      return mergeAct(existing, actPatch);
    });
    const selectedAct = acts.find((act) => act.id === patch.structure?.selectedActId) ?? acts[0]!;
    const selectedScene =
      selectedAct.scenes.find((scene) => scene.id === patch.structure?.selectedSceneId) ??
      selectedAct.scenes[0]!;
    next.structure = {
      acts,
      selectedActId: selectedAct.id,
      selectedSceneId: selectedScene.id,
    };
  }

  return normalizeStoryProject(next);
}

function stringifyPreview(value: unknown): string {
  if (Array.isArray(value)) return value.join("\n");
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value === undefined || value === null) return "";
  return JSON.stringify(value);
}

function getPreviewValue(project: StoryProject, field: string): unknown {
  const parts = field.split(".");
  let value: unknown = project;
  for (const part of parts) {
    if (value === null || typeof value !== "object") return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}

function collectPatchFields(patch: StoryProjectPatch, prefix = ""): string[] {
  const fields: string[] = [];
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const field = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(value)) {
      fields.push(field);
    } else if (value && typeof value === "object") {
      if (key === "characters" || key === "acts" || key === "structure") {
        fields.push(field);
      } else {
        fields.push(...collectPatchFields(value as StoryProjectPatch, field));
      }
    } else {
      fields.push(field);
    }
  }
  return fields;
}

export type CreatorStoryAssistantPatchPreview = {
  field: string;
  before: string;
  after: string;
};

export function previewCreatorStoryAssistantPatch(
  project: StoryProject,
  patch: StoryProjectPatch,
): CreatorStoryAssistantPatchPreview[] {
  if (!hasCreatorStoryAssistantPatch(patch)) return [];
  const merged = mergeCreatorStoryAssistantPatch(project, patch);
  return collectPatchFields(patch)
    .map((field) => ({
      field,
      before: stringifyPreview(getPreviewValue(project, field)),
      after: stringifyPreview(getPreviewValue(merged, field)),
    }))
    .filter((item) => item.before !== item.after)
    .slice(0, 12);
}
