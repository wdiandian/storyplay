import { compileStoryProjectToStartRequest } from "@/lib/storyProject/compiler";
import { publishFixedRuntimePackage, selectPublishedFixedRuntimePackage } from "@/lib/storyProject/fixedRuntime";
import { compileOpeningPackage } from "@/lib/storyProject/openingPackage";
import type { StoryProject } from "@/lib/storyProject/types";
import type { StorySku, StorySkuGender } from "@/lib/storySku/manifest";

export type StoryProjectPublishBuild = {
  sku: StorySku;
  warnings: Array<{ field: string; message: string }>;
};

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function projectAudienceToSkuGender(audience: StoryProject["audience"]): StorySkuGender {
  return audience === "female" ? "female" : "male";
}

function projectAudienceLabel(audience: StoryProject["audience"]): StorySku["audienceLabel"] {
  return audience === "female" ? "女性向" : "男性向";
}

export function createStorySkuIdFromProject(project: StoryProject) {
  if (project.publish.skuId.trim()) return project.publish.skuId.trim();
  return `sp_sku_${project.id.replace(/^sp_project_?/, "")}`;
}

export function buildStorySkuFromProject(project: StoryProject): StoryProjectPublishBuild {
  const build = compileStoryProjectToStartRequest(project);
  const openingPackage = compileOpeningPackage(project);
  const fixedRuntimePackage = publishFixedRuntimePackage(selectPublishedFixedRuntimePackage(project));
  const now = new Date().toISOString();
  const skuId = createStorySkuIdFromProject(project);
  const tags = uniqueStrings([...project.genres, ...project.moods, ...project.tags]);
  const stylePrompt =
    project.visual.stylePrompt.trim() || project.runtimePolicy.styleGuide.trim() || build.startRequest.styleGuide || "auto";
  const assetCover = project.assets.find((asset) => asset.kind === "cover" && asset.url.trim())?.url.trim();
  const assetFirstScene = project.assets.find((asset) => asset.kind === "first-scene" && asset.url.trim())?.url.trim();
  const characterPortraits = project.characters
    .map((character) => character.referenceImageUrl.trim())
    .filter(Boolean);
  const cover = project.visual.cover.trim() || assetCover || "/home/storyplay-creator-cover.svg";
  const firstScene = project.visual.firstScene.trim() || assetFirstScene;

  return {
    sku: {
      id: skuId,
      gender: projectAudienceToSkuGender(project.audience),
      audienceLabel: projectAudienceLabel(project.audience),
      title: project.title,
      logline: project.logline || project.synopsis,
      synopsis: project.synopsis || project.logline,
      tags,
      genreTagsRaw: tags.join("、"),
      stylePrompt,
      assets: {
        cover,
        firstScene: firstScene || undefined,
        firstScenePortrait: firstScene || undefined,
        portraits: characterPortraits,
        portraitsPortrait: characterPortraits,
      },
      firstAct: {},
      runtimeSummary: {
        sceneKey: fixedRuntimePackage?.history[0]?.scene.sceneKey ?? openingPackage?.scene.sceneKey,
        beatsCount: fixedRuntimePackage?.beatCount ?? openingPackage?.scene.beats.length ?? 0,
        choicesCount: fixedRuntimePackage?.history.reduce(
          (sum, entry) =>
            sum + entry.scene.beats.reduce(
              (beatSum, beat) => beatSum + (beat.next.type === "choice" ? beat.next.choices.length : 0),
              0,
            ),
          0,
        ) ?? openingPackage?.scene.beats.reduce(
          (sum, beat) => sum + (beat.next.type === "choice" ? beat.next.choices.length : 0),
          0,
        ) ?? 0,
        charactersCount: project.characters.length,
      },
      creatorRuntime: {
        startRequest: {
          ...build.startRequest,
          source: "creator-sku",
          projectId: project.id,
          projectTitle: project.title,
          skuId,
        },
        openingPackage,
        fixedRuntimePackage,
        interactionPolicy: project.interaction,
        sourceActId: build.sourceActId,
        sourceSceneId: build.sourceSceneId,
        publishedAt: now,
      },
      publish: {
        status: "active",
        source: "creator",
        sourceProjectId: project.id,
      },
      curation: {
        sortOrder: -Date.now(),
        featured: true,
      },
    },
    warnings: build.warnings,
  };
}
