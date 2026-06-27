import type {
  Beat,
  Character,
  Scene,
  StartResponse,
  StoryState,
} from "@storyplay/types";
import { renderStoryOutlineGuardrail } from "@/lib/storyProject/outlineCompiler";
import type {
  StoryProject,
  StoryProjectCharacter,
  StoryProjectOpeningPackage,
} from "@/lib/storyProject/types";

export type OpeningPackageValidationIssue = {
  field: string;
  message: string;
  severity: "error" | "warning";
};

export type PublishedOpeningPackage = {
  source: "story-project";
  projectId: string;
  projectTitle: string;
  packageId: string;
  scene: Scene;
  imageUrl: string;
  characters: Character[];
  storyState: StoryState;
  worldSetting: string;
  styleGuide: string;
};

function trim(value: string | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function hasDisplayText(beat: StoryProjectOpeningPackage["scene"]["beats"][number]) {
  return Boolean(trim(beat.narration) || trim(beat.line));
}

function hasChangeSceneExit(pkg: StoryProjectOpeningPackage) {
  return pkg.scene.beats.some((beat) =>
    beat.next.type === "choice" &&
    beat.next.choices.some((choice) => choice.effect.kind === "change-scene" && trim(choice.effect.nextSceneSeed)),
  );
}

export function validateOpeningPackage(pkg: StoryProjectOpeningPackage): OpeningPackageValidationIssue[] {
  const issues: OpeningPackageValidationIssue[] = [];
  const beatIds = new Set(pkg.scene.beats.map((beat) => beat.id));

  if (pkg.status === "empty") {
    issues.push({ field: "openingPackage.status", message: "首场包尚未启用。", severity: "warning" });
    return issues;
  }

  if (!trim(pkg.scene.backgroundImageUrl)) {
    issues.push({ field: "openingPackage.scene.backgroundImageUrl", message: "缺少首场背景图。", severity: "error" });
  }
  if (!pkg.scene.beats.length) {
    issues.push({ field: "openingPackage.scene.beats", message: "缺少首场脚本 Beat。", severity: "error" });
  }
  if (!beatIds.has(pkg.scene.entryBeatId)) {
    issues.push({ field: "openingPackage.scene.entryBeatId", message: "入口 Beat 不存在。", severity: "error" });
  }

  for (const beat of pkg.scene.beats) {
    if (!hasDisplayText(beat)) {
      issues.push({ field: `openingPackage.scene.beats.${beat.id}`, message: "Beat 缺少旁白或对白。", severity: "error" });
    }
    if (beat.next.type === "continue" && !beatIds.has(beat.next.nextBeatId)) {
      issues.push({ field: `openingPackage.scene.beats.${beat.id}.next`, message: "Continue 目标 Beat 不存在。", severity: "error" });
    }
    if (beat.next.type === "choice") {
      if (beat.next.choices.length === 0) {
        issues.push({ field: `openingPackage.scene.beats.${beat.id}.choices`, message: "选择节点缺少选项。", severity: "error" });
      }
      for (const choice of beat.next.choices) {
        if (!trim(choice.label)) {
          issues.push({ field: `openingPackage.scene.beats.${beat.id}.choices.${choice.id}`, message: "选项缺少文案。", severity: "error" });
        }
        if (choice.effect.kind === "advance-beat" && !beatIds.has(choice.effect.targetBeatId)) {
          issues.push({ field: `openingPackage.scene.beats.${beat.id}.choices.${choice.id}`, message: "本场跳转目标不存在。", severity: "error" });
        }
        if (choice.effect.kind === "change-scene" && !trim(choice.effect.nextSceneSeed)) {
          issues.push({ field: `openingPackage.scene.beats.${beat.id}.choices.${choice.id}`, message: "AI 续写出口缺少方向。", severity: "error" });
        }
      }
    }
  }

  if (!hasChangeSceneExit(pkg)) {
    issues.push({ field: "openingPackage.scene.exits", message: "至少需要一个进入 AI 续写的出口。", severity: "error" });
  }
  if (!trim(pkg.storyState.logline)) {
    issues.push({ field: "openingPackage.storyState.logline", message: "首场记忆缺少 logline。", severity: "error" });
  }
  if (!trim(pkg.storyState.protagonist)) {
    issues.push({ field: "openingPackage.storyState.protagonist", message: "首场记忆缺少主角设定。", severity: "error" });
  }
  if (!trim(pkg.storyState.nextHook)) {
    issues.push({ field: "openingPackage.storyState.nextHook", message: "首场记忆缺少下一场钩子。", severity: "error" });
  }

  if (!pkg.scene.beats.some((beat) => trim(beat.speaker) && trim(beat.line))) {
    issues.push({ field: "openingPackage.scene.dialogue", message: "首场没有对白，体验可能偏静态。", severity: "warning" });
  }
  if (!pkg.scene.beats.some((beat) => beat.activeCharacters.length > 0)) {
    issues.push({ field: "openingPackage.scene.activeCharacters", message: "首场没有配置出场角色。", severity: "warning" });
  }
  if (!trim(pkg.scene.sceneKey)) {
    issues.push({ field: "openingPackage.scene.sceneKey", message: "缺少 sceneKey，后续视觉连续性会较弱。", severity: "warning" });
  }

  return issues;
}

export function isOpeningPackageReady(pkg: StoryProjectOpeningPackage) {
  return pkg.status !== "empty" && validateOpeningPackage(pkg).every((issue) => issue.severity !== "error");
}

function characterToRuntime(character: StoryProjectCharacter): Character {
  return {
    name: character.name,
    visualDescription: character.visualNotes,
    voiceDescription: character.voiceNotes,
  };
}

function buildFallbackStoryState(project: StoryProject): StoryState {
  return {
    logline: project.logline || project.synopsis || project.title,
    genreTags: uniqueStrings([...project.genres, ...project.moods, ...project.tags]).join(" / "),
    protagonist: project.narrative.protagonist || project.title,
    castNotes: project.characters
      .filter((character) => character.name)
      .map((character) => `${character.name}: ${character.persona || character.relationshipToPlayer || character.role}`)
      .join("\n"),
    synopsis: project.synopsis || project.logline || project.title,
    openThreads: project.narrative.keyMysteries,
    relationships: project.characters
      .filter((character) => character.name && character.relationshipToPlayer)
      .map((character) => `${character.name}: ${character.relationshipToPlayer}`),
    nextHook: project.narrative.chapterGoals || project.synopsis || project.logline || "故事继续推进",
  };
}

function buildStoryState(project: StoryProject): StoryState {
  const fallback = buildFallbackStoryState(project);
  const state = project.openingPackage.storyState;
  return {
    logline: trim(state.logline) || fallback.logline,
    genreTags: trim(state.genreTags) || fallback.genreTags,
    protagonist: trim(state.protagonist) || fallback.protagonist,
    castNotes: trim(state.castNotes) || fallback.castNotes,
    synopsis: trim(state.synopsis) || fallback.synopsis,
    openThreads: state.openThreads.length ? state.openThreads : fallback.openThreads,
    relationships: state.relationships.length ? state.relationships : fallback.relationships,
    nextHook: trim(state.nextHook) || fallback.nextHook,
  };
}

function openingBeatToRuntime(beat: StoryProjectOpeningPackage["scene"]["beats"][number]): Beat {
  return {
    id: beat.id,
    narration: trim(beat.narration) || undefined,
    speaker: trim(beat.speaker) || undefined,
    line: trim(beat.line) || undefined,
    lineDelivery: trim(beat.lineDelivery) || undefined,
    activeCharacters: beat.activeCharacters.length ? beat.activeCharacters : undefined,
    next: beat.next,
  };
}

export function compileOpeningPackage(project: StoryProject): PublishedOpeningPackage | undefined {
  const pkg = project.openingPackage;
  if (!isOpeningPackageReady(pkg)) return undefined;

  const imageUrl = trim(pkg.scene.backgroundImageUrl);
  const scene: Scene = {
    id: pkg.scene.id,
    scenePrompt: trim(pkg.scene.scenePrompt) || trim(pkg.scene.location) || project.title,
    beats: pkg.scene.beats.map((beat) => openingBeatToRuntime(beat)),
    entryBeatId: pkg.scene.entryBeatId,
    sceneKey: trim(pkg.scene.sceneKey) || undefined,
    imageUuid: trim(pkg.scene.backgroundImageUuid) || undefined,
    imageUrl,
    orientation: pkg.scene.orientation,
  };
  const storyState = buildStoryState(project);
  const characters = project.characters
    .filter((character) => trim(character.name))
    .map((character) => characterToRuntime(character));

  return {
    source: "story-project",
    projectId: project.id,
    projectTitle: project.title,
    packageId: pkg.id,
    scene,
    imageUrl,
    characters,
    storyState,
    worldSetting: [
      project.world.setting || project.synopsis || project.logline || project.title,
      renderStoryOutlineGuardrail(project) ? `【剧情大纲护栏】\n${renderStoryOutlineGuardrail(project)}` : "",
    ].filter(Boolean).join("\n\n"),
    styleGuide: project.visual.stylePrompt || project.runtimePolicy.styleGuide || "auto",
  };
}

export function openingPackageToStartResponse(openingPackage: PublishedOpeningPackage): StartResponse {
  return {
    sessionId: `s_opening_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    scene: openingPackage.scene,
    imageUrl: openingPackage.imageUrl,
    characters: openingPackage.characters,
    storyState: openingPackage.storyState,
  };
}
