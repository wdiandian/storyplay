import type { SceneHistoryEntry } from "@storyplay/types";
import type {
  StoryProject,
  StoryProjectFixedRuntimePackage,
  StoryProjectPlaytestRecord,
} from "@/lib/storyProject/types";

export type PublishedFixedRuntimePackage = Pick<
  StoryProjectFixedRuntimePackage,
  "id" | "title" | "summary" | "sourcePlaytestId" | "sceneCount" | "beatCount" | "imageCount" | "history" | "storyState"
>;

function countVisitedBeats(history: SceneHistoryEntry[]) {
  return history.reduce((sum, entry) => sum + entry.visitedBeatIds.length, 0);
}

function countImages(history: SceneHistoryEntry[]) {
  return history.reduce((sum, entry) => sum + (entry.scene.imageUrl ? 1 : 0), 0);
}

export function createFixedRuntimePackageFromPlaytest(
  project: StoryProject,
  playtest: StoryProjectPlaytestRecord,
  input: { title?: string; notes?: string } = {},
): StoryProjectFixedRuntimePackage {
  const now = new Date().toISOString();
  const history = playtest.recordedHistory;
  const title =
    input.title?.trim() ||
    `${project.title || "未命名故事"} 固定剧情 ${project.fixedRuntimePackages.length + 1}`;

  return {
    id: `sp_fixed_runtime_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    status: "ready",
    title,
    summary: playtest.summary || history[0]?.scene.scenePrompt || project.logline || project.synopsis,
    sourcePlaytestId: playtest.id,
    sceneCount: history.length,
    beatCount: countVisitedBeats(history),
    imageCount: countImages(history),
    history,
    storyState: playtest.finalStoryState,
    shareEnabled: false,
    createdAt: now,
    updatedAt: now,
    notes: input.notes?.trim() || "",
  };
}

export function selectPublishedFixedRuntimePackage(project: StoryProject) {
  return (
    project.fixedRuntimePackages.find((pkg) => pkg.status === "published" && pkg.history.length > 0) ??
    project.fixedRuntimePackages.find((pkg) => pkg.status === "ready" && pkg.history.length > 0)
  );
}

export function publishFixedRuntimePackage(
  pkg: StoryProjectFixedRuntimePackage | undefined,
): PublishedFixedRuntimePackage | undefined {
  if (!pkg || pkg.history.length === 0) return undefined;
  return {
    id: pkg.id,
    title: pkg.title,
    summary: pkg.summary,
    sourcePlaytestId: pkg.sourcePlaytestId,
    sceneCount: pkg.sceneCount,
    beatCount: pkg.beatCount,
    imageCount: pkg.imageCount,
    history: pkg.history,
    storyState: pkg.storyState,
  };
}
