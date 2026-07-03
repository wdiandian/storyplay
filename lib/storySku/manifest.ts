import manifest from "@/public/home/manifest.json";
import type { StartRequest } from "@storyplay/types";
import type { Gender } from "@/lib/options";
import type { PublishedFixedRuntimePackage } from "@/lib/storyProject/fixedRuntime";
import type { PublishedOpeningPackage } from "@/lib/storyProject/openingPackage";
import type { StoryProject } from "@/lib/storyProject/types";
import { inferStorySkuTaxonomy } from "@/lib/storySku/taxonomy";

export type StorySkuGender = "male" | "female";

export type StorySku = {
  id: string;
  gender: StorySkuGender;
  audienceLabel: "男性向" | "女性向";
  title: string;
  logline: string;
  synopsis: string;
  tags: string[];
  genreTagsRaw: string;
  stylePrompt: string;
  assets: {
    cover: string | null;
    firstScene?: string;
    firstScenePortrait?: string;
    portraits: string[];
    portraitsPortrait: string[];
  };
  firstAct: Record<string, string | undefined>;
  runtimeSummary: {
    sceneKey?: string;
    beatsCount: number;
    choicesCount: number;
    charactersCount: number;
  };
  creatorRuntime?: {
    startRequest: StartRequest;
    openingPackage?: PublishedOpeningPackage;
    fixedRuntimePackage?: PublishedFixedRuntimePackage;
    interactionPolicy?: StoryProject["interaction"];
    sourceActId?: string;
    sourceSceneId?: string;
    publishedAt: string;
  };
  publish: {
    status: "active" | "draft" | "archived";
    source: "preset" | "creator";
    sourceProjectId?: string;
    ownerUserId?: string;
    publishedByUserId?: string;
    publishedAt?: string;
  };
  curation: {
    sortOrder: number;
    featured: boolean;
  };
};

const stories = (manifest.stories as StorySku[]).slice().sort((a, b) => {
  if (a.gender !== b.gender) return a.gender.localeCompare(b.gender);
  return a.curation.sortOrder - b.curation.sortOrder;
});

export function genderToSkuGender(gender: Gender): StorySkuGender {
  return gender === "女性向" ? "female" : "male";
}

export function listFeaturedStorySkusByGender(gender: StorySkuGender): StorySku[] {
  return stories.filter((story) => story.gender === gender && story.curation.featured);
}

export function listFeaturedStorySkus(gender: Gender): StorySku[] {
  return listFeaturedStorySkusByGender(genderToSkuGender(gender));
}

export function listAllStorySkus(): StorySku[] {
  return stories;
}

export function getStorySkuById(id: string): StorySku | undefined {
  return stories.find((story) => story.id === id);
}

export function storySkuToCard(story: StorySku) {
  const taxonomy = inferStorySkuTaxonomy(story);
  return {
    id: story.id,
    title: story.title,
    outline: story.logline || story.synopsis,
    coverPath: story.assets.cover ?? `/home/${story.id}.webp`,
    genres: taxonomy.genres,
    moods: taxonomy.moods,
    interaction: taxonomy.interaction,
    structure: taxonomy.structure,
    visualStyle: taxonomy.visualStyle,
    source: story.publish.source,
    sourceProjectId: story.publish.sourceProjectId,
    ownerUserId: story.publish.ownerUserId,
    publishedAt: story.publish.publishedAt,
    startRequest: story.creatorRuntime?.startRequest,
    openingPackage: story.creatorRuntime?.openingPackage,
    fixedRuntimePackage: story.creatorRuntime?.fixedRuntimePackage,
    interactionPolicy: story.creatorRuntime?.interactionPolicy,
  };
}

export function storySkuToFeaturedRow(story: StorySku) {
  return {
    id: story.id,
    gender: story.gender,
    title: story.title,
    outline: story.logline || story.synopsis,
    style: story.stylePrompt,
    tags: JSON.stringify(story.tags),
    coverPath: story.assets.cover ?? `/home/${story.id}.webp`,
    firstactPath: story.firstAct.zh ?? `/home/firstact/${story.id}.json`,
    firstscenePath: story.assets.firstScene ?? null,
    source: story.publish.source,
    sourceProjectId: story.publish.sourceProjectId,
    ownerUserId: story.publish.ownerUserId,
    publishedAt: story.publish.publishedAt,
    startRequest: story.creatorRuntime?.startRequest,
    openingPackage: story.creatorRuntime?.openingPackage,
    fixedRuntimePackage: story.creatorRuntime?.fixedRuntimePackage,
    interactionPolicy: story.creatorRuntime?.interactionPolicy,
    sortOrder: story.curation.sortOrder,
    isActive: story.publish?.status === "archived" ? 0 : 1,
    clickCount: 0,
  };
}
