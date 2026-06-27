import type { StorySku } from "@/lib/storySku/manifest";
import {
  inferStorySkuTaxonomy,
  storySkuContentWarningOptions,
  storySkuGenreOptions,
  storySkuInteractionOptions,
  storySkuMoodOptions,
  storySkuStructureOptions,
  storySkuVisualStyleOptions,
  type StorySkuContentWarning,
  type StorySkuGenre,
  type StorySkuInteraction,
  type StorySkuMood,
  type StorySkuStructure,
  type StorySkuVisualStyle,
} from "@/lib/storySku/taxonomy";

export type StorySkuDraft = {
  id: string;
  title: string;
  logline: string;
  synopsis: string;
  tagsText: string;
  genres: StorySkuGenre[];
  moods: StorySkuMood[];
  interaction: StorySkuInteraction;
  structure: StorySkuStructure;
  visualStyle: StorySkuVisualStyle;
  contentWarnings: StorySkuContentWarning[];
  cover: string;
  firstScene: string;
  sortOrder: number;
  featured: boolean;
  status: StorySku["publish"]["status"];
};

export type StorySkuDraftIssue = {
  field: keyof StorySkuDraft;
  message: string;
  severity: "error" | "warning";
};

export function createStorySkuDraft(sku: StorySku): StorySkuDraft {
  const taxonomy = inferStorySkuTaxonomy(sku);
  return {
    id: sku.id,
    title: sku.title,
    logline: sku.logline,
    synopsis: sku.synopsis,
    tagsText: sku.tags.join("、"),
    genres: taxonomy.genres,
    moods: taxonomy.moods,
    interaction: taxonomy.interaction,
    structure: taxonomy.structure,
    visualStyle: taxonomy.visualStyle,
    contentWarnings: taxonomy.contentWarnings,
    cover: sku.assets.cover ?? `/home/${sku.id}.webp`,
    firstScene: sku.assets.firstScene ?? "",
    sortOrder: sku.curation.sortOrder,
    featured: sku.curation.featured,
    status: sku.publish.status,
  };
}

export function createStorySkuDraftMap(skus: StorySku[]): Record<string, StorySkuDraft> {
  return Object.fromEntries(skus.map((sku) => [sku.id, createStorySkuDraft(sku)]));
}

export function normalizeDraftTags(tagsText: string): string[] {
  return tagsText
    .split(/[、,，\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function validateStorySkuDraft(draft: StorySkuDraft): StorySkuDraftIssue[] {
  const issues: StorySkuDraftIssue[] = [];
  const title = draft.title.trim();
  const logline = draft.logline.trim();
  const synopsis = draft.synopsis.trim();
  const tags = normalizeDraftTags(draft.tagsText);

  if (!title) {
    issues.push({ field: "title", message: "标题不能为空", severity: "error" });
  } else if (title.length > 32) {
    issues.push({ field: "title", message: "标题建议控制在 32 字以内", severity: "warning" });
  }

  if (!logline) {
    issues.push({ field: "logline", message: "一句话卖点不能为空", severity: "error" });
  } else if (logline.length > 90) {
    issues.push({ field: "logline", message: "一句话卖点过长，首页卡片会难以扫读", severity: "warning" });
  }

  if (!synopsis) {
    issues.push({ field: "synopsis", message: "简介不能为空", severity: "error" });
  } else if (synopsis.length > 280) {
    issues.push({ field: "synopsis", message: "简介建议控制在 280 字以内", severity: "warning" });
  }

  if (tags.length === 0) {
    issues.push({ field: "tagsText", message: "至少需要 1 个标签", severity: "error" });
  } else if (tags.length > 6) {
    issues.push({ field: "tagsText", message: "标签建议不超过 6 个", severity: "warning" });
  }

  if (draft.genres.length === 0) {
    issues.push({ field: "genres", message: "至少需要 1 个主类型", severity: "error" });
  } else if (draft.genres.length > 3) {
    issues.push({ field: "genres", message: "主类型建议不超过 3 个", severity: "warning" });
  }

  if (draft.moods.length === 0) {
    issues.push({ field: "moods", message: "至少需要 1 个情绪调性", severity: "error" });
  } else if (draft.moods.length > 4) {
    issues.push({ field: "moods", message: "情绪调性建议不超过 4 个", severity: "warning" });
  }

  if (!Number.isInteger(draft.sortOrder) || draft.sortOrder < 0) {
    issues.push({ field: "sortOrder", message: "排序必须是非负整数", severity: "error" });
  }

  if (!draft.cover.trim()) {
    issues.push({ field: "cover", message: "封面路径不能为空", severity: "error" });
  }

  if (!draft.firstScene.trim()) {
    issues.push({ field: "firstScene", message: "缺少首图会降低详情和试玩入口体验", severity: "warning" });
  }

  return issues;
}

export function isStorySkuDraftDirty(sku: StorySku, draft: StorySkuDraft): boolean {
  const initial = createStorySkuDraft(sku);
  return JSON.stringify(initial) !== JSON.stringify(draft);
}

export function pickDirtyStorySkuDrafts(
  skus: StorySku[],
  drafts: Record<string, StorySkuDraft>,
): Record<string, StorySkuDraft> {
  const dirtyDrafts: Record<string, StorySkuDraft> = {};

  for (const sku of skus) {
    const draft = drafts[sku.id];
    if (draft && isStorySkuDraftDirty(sku, draft)) {
      dirtyDrafts[sku.id] = draft;
    }
  }

  return dirtyDrafts;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readStatus(value: unknown, fallback: StorySkuDraft["status"]): StorySkuDraft["status"] {
  return value === "active" || value === "draft" || value === "archived" ? value : fallback;
}

function readStringArrayOption<T extends string>(
  value: unknown,
  options: readonly T[],
  fallback: T[],
): T[] {
  if (!Array.isArray(value)) return fallback;
  const filtered = value.filter((item): item is T => typeof item === "string" && options.includes(item as T));
  return Array.from(new Set(filtered));
}

function readStringOption<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === "string" && options.includes(value as T) ? (value as T) : fallback;
}

export function mergeStoredStorySkuDrafts(
  skus: StorySku[],
  stored: unknown,
): Record<string, StorySkuDraft> {
  const nextDrafts = createStorySkuDraftMap(skus);
  if (!isRecord(stored)) return nextDrafts;

  for (const sku of skus) {
    const storedDraft = stored[sku.id];
    if (!isRecord(storedDraft)) continue;

    const baseDraft = nextDrafts[sku.id]!;
    nextDrafts[sku.id] = {
      id: sku.id,
      title: readString(storedDraft.title, baseDraft.title),
      logline: readString(storedDraft.logline, baseDraft.logline),
      synopsis: readString(storedDraft.synopsis, baseDraft.synopsis),
      tagsText: readString(storedDraft.tagsText, baseDraft.tagsText),
      genres: readStringArrayOption(storedDraft.genres, storySkuGenreOptions, baseDraft.genres),
      moods: readStringArrayOption(storedDraft.moods, storySkuMoodOptions, baseDraft.moods),
      interaction: readStringOption(
        storedDraft.interaction,
        storySkuInteractionOptions,
        baseDraft.interaction,
      ),
      structure: readStringOption(storedDraft.structure, storySkuStructureOptions, baseDraft.structure),
      visualStyle: readStringOption(
        storedDraft.visualStyle,
        storySkuVisualStyleOptions,
        baseDraft.visualStyle,
      ),
      contentWarnings: readStringArrayOption(
        storedDraft.contentWarnings,
        storySkuContentWarningOptions,
        baseDraft.contentWarnings,
      ),
      cover: readString(storedDraft.cover, baseDraft.cover),
      firstScene: readString(storedDraft.firstScene, baseDraft.firstScene),
      sortOrder: readNumber(storedDraft.sortOrder, baseDraft.sortOrder),
      featured: readBoolean(storedDraft.featured, baseDraft.featured),
      status: readStatus(storedDraft.status, baseDraft.status),
    };
  }

  return nextDrafts;
}
