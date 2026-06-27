import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Beat, Scene } from "@/lib/types";
import {
  createStoryProject,
  createStoryProjectCharacter,
  createStoryProjectOpeningPackage,
  type StoryProject,
  type StoryProjectAudience,
  type StoryProjectOpeningBeat,
} from "@/lib/storyProject/types";
import { getStorySkuById, type StorySku } from "@/lib/storySku/manifest";
import { inferStorySkuTaxonomy } from "@/lib/storySku/taxonomy";

type PresetFirstAct = {
  scene?: Scene & {
    imageUrl?: string;
    imageUuid?: string;
  };
  imageUrl?: string;
  characters?: Array<{
    name?: string;
    voiceDescription?: string;
    visualDescription?: string;
    basePortraitUrl?: string;
  }>;
  storyState?: {
    logline?: string;
    genreTags?: string;
    protagonist?: string;
    castNotes?: string;
    synopsis?: string;
    openThreads?: string[];
    relationships?: string[];
    nextHook?: string;
  };
  worldSetting?: string;
  styleGuide?: string;
};

function skuGenderToAudience(sku: StorySku): StoryProjectAudience {
  return sku.gender === "female" ? "female" : "male";
}

function readPublicJsonPath(publicPath: string) {
  const normalizedPath = publicPath.replace(/^\/+/, "").replaceAll("/", path.sep);
  return path.join(process.cwd(), "public", normalizedPath.replace(/^home[\\/]/, "home" + path.sep));
}

async function readPresetFirstAct(sku: StorySku): Promise<PresetFirstAct | null> {
  const firstActPath = sku.firstAct.zh;
  if (!firstActPath) return null;

  try {
    const raw = await readFile(readPublicJsonPath(firstActPath), "utf8");
    return JSON.parse(raw) as PresetFirstAct;
  } catch {
    return null;
  }
}

function normalizeOpeningBeat(beat: Beat): StoryProjectOpeningBeat {
  return {
    id: beat.id,
    kind: beat.speaker || beat.line ? "dialogue" : "narration",
    narration: beat.narration ?? "",
    speaker: beat.speaker ?? "",
    line: beat.line ?? "",
    lineDelivery: beat.lineDelivery ?? "",
    activeCharacters: (beat.activeCharacters ?? [])
      .map((character) => ({
        name: character.name.trim(),
        pose: character.pose?.trim() ?? "",
      }))
      .filter((character) => character.name),
    next: beat.next,
    locked: true,
  };
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function createCharactersFromPreset(firstAct: PresetFirstAct | null): StoryProject["characters"] {
  const byName = new Map<string, StoryProject["characters"][number]>();

  for (const character of firstAct?.characters ?? []) {
    const name = character.name?.trim();
    if (!name) continue;
    byName.set(name, createStoryProjectCharacter({
      name,
      persona: character.voiceDescription ?? "",
      visualNotes: character.visualDescription ?? character.basePortraitUrl ?? "",
      source: "imported",
      locked: true,
    }));
  }

  for (const beat of firstAct?.scene?.beats ?? []) {
    for (const character of beat.activeCharacters ?? []) {
      const name = character.name.trim();
      if (!name || byName.has(name)) continue;
      byName.set(name, createStoryProjectCharacter({
        name,
        visualNotes: character.pose ?? "",
        source: "imported",
        locked: true,
      }));
    }
  }

  return Array.from(byName.values());
}

export async function createStoryProjectFromPresetSkuId(skuId: string): Promise<StoryProject | null> {
  const sku = getStorySkuById(skuId);
  if (!sku || sku.publish.source !== "preset") return null;

  const firstAct = await readPresetFirstAct(sku);
  const taxonomy = inferStorySkuTaxonomy(sku);
  const storyState = firstAct?.storyState;
  const scene = firstAct?.scene;
  const project = createStoryProject({
    title: `${sku.title} · 可编辑副本`,
    logline: storyState?.logline ?? sku.logline,
    synopsis: storyState?.synopsis ?? sku.synopsis,
    audience: skuGenderToAudience(sku),
    genres: taxonomy.genres,
    moods: taxonomy.moods,
    tags: uniqueStrings([...sku.tags, sku.id, "预设导入"]),
    world: {
      setting: firstAct?.worldSetting ?? sku.synopsis,
      tone: sku.genreTagsRaw,
      locations: scene?.sceneKey ?? "",
    },
    narrative: {
      protagonist: storyState?.protagonist ?? "",
      coreConflict: sku.logline,
      keyMysteries: storyState?.openThreads ?? [],
      chapterGoals: storyState?.nextHook ?? "",
      creatorNotes: `从系统预设 ${sku.id}「${sku.title}」复制生成。原预设不会被直接修改。`,
    },
    storyOutline: {
      mainGoal: storyState?.nextHook ?? sku.logline,
      phaseOutline: storyState?.synopsis ?? sku.synopsis,
      requiredBeats: storyState?.openThreads ?? [],
      relationshipArc: (storyState?.relationships ?? []).join("\n"),
      endingDirection: "",
      guardrails: [
        "保留原预设的核心爽点和人物关系。",
        "后续改写应围绕剧情大纲推进，避免脱离首场承诺。",
      ],
    },
    interaction: {
      intensity:
        taxonomy.interaction === "强互动"
          ? "strong"
          : taxonomy.interaction === "轻互动"
            ? "light"
            : "medium",
      choiceStyle: "关键选择推动关系变化和剧情转折。",
      branchNotes: "",
      freeformInput: true,
    },
    visual: {
      stylePrompt: firstAct?.styleGuide ?? sku.stylePrompt,
      cover: sku.assets.cover ?? "",
      firstScene: sku.assets.firstScene ?? "",
    },
  });

  return {
    ...project,
    characters: createCharactersFromPreset(firstAct),
    openingPackage: createStoryProjectOpeningPackage({
      status: scene ? "ready" : "empty",
      source: "imported",
      updatedAt: new Date().toISOString(),
      scene: {
        id: scene?.id ?? `${sku.id}_opening_scene`,
        title: sku.title,
        location: scene?.sceneKey ?? "",
        sceneKey: scene?.sceneKey ?? "",
        scenePrompt: scene?.scenePrompt ?? sku.stylePrompt,
        orientation: "portrait",
        backgroundImageUrl: scene?.imageUrl ?? firstAct?.imageUrl ?? sku.assets.firstScene ?? "",
        backgroundImageUuid: scene?.imageUuid ?? "",
        beats: (scene?.beats ?? []).map((beat) => normalizeOpeningBeat(beat)),
        entryBeatId: scene?.entryBeatId ?? scene?.beats?.[0]?.id ?? "b1",
      },
      storyState: {
        logline: storyState?.logline ?? sku.logline,
        genreTags: storyState?.genreTags ?? sku.genreTagsRaw,
        protagonist: storyState?.protagonist ?? "",
        castNotes: storyState?.castNotes ?? "",
        synopsis: storyState?.synopsis ?? sku.synopsis,
        openThreads: storyState?.openThreads ?? [],
        relationships: storyState?.relationships ?? [],
        nextHook: storyState?.nextHook ?? "",
      },
    }),
  };
}
