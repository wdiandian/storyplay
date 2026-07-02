import { NextResponse } from "next/server";
import {
  getStoredStoryProject,
  saveStoredStoryProject,
} from "@/lib/storyProject/store";
import type { SceneHistoryEntry, StoryState } from "@storyplay/types";
import type { StoryProjectPlaytestRecord, StoryProjectPlaytestStatus } from "@/lib/storyProject/types";

export const runtime = "nodejs";

type ProjectPlaytestResultRouteContext = {
  params: Promise<{ id: string; playtestId: string }>;
};

type PlaytestResultPayload = {
  status?: StoryProjectPlaytestStatus;
  sessionId?: string;
  summary?: string;
  firstSceneId?: string;
  firstSceneKey?: string;
  firstSceneImageUrl?: string;
  sceneCount?: number;
  characterCount?: number;
  recordedHistory?: SceneHistoryEntry[];
  finalStoryState?: StoryState;
  notes?: string;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function sanitizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function sanitizeRecordedHistory(value: unknown): SceneHistoryEntry[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((entry): entry is SceneHistoryEntry => {
      if (!entry || typeof entry !== "object") return false;
      const candidate = entry as Partial<SceneHistoryEntry>;
      return Boolean(
        candidate.scene &&
          typeof candidate.scene === "object" &&
          typeof candidate.scene.id === "string" &&
          Array.isArray(candidate.scene.beats) &&
          typeof candidate.scene.entryBeatId === "string" &&
          Array.isArray(candidate.visitedBeatIds),
      );
    })
    .slice(0, 20);
}

function sanitizeStoryState(value: unknown): StoryState | undefined {
  if (!value || typeof value !== "object") return undefined;
  return value as StoryState;
}

function sanitizeStatus(value: unknown): StoryProjectPlaytestStatus {
  return value === "started" || value === "completed" || value === "discarded" ? value : "started";
}

export async function PATCH(req: Request, context: ProjectPlaytestResultRouteContext) {
  const { id, playtestId } = await context.params;
  const project = await getStoredStoryProject(id);
  if (!project) return jsonError("Unknown project id", 404);

  let payload: PlaytestResultPayload;
  try {
    payload = (await req.json()) as PlaytestResultPayload;
  } catch {
    return jsonError("Invalid JSON payload");
  }

  const playtestIndex = project.playtests.findIndex((playtest) => playtest.id === playtestId);
  if (playtestIndex < 0) return jsonError("Unknown playtest id", 404);

  const now = new Date().toISOString();
  const nextPlaytests = [...project.playtests];
  const current = nextPlaytests[playtestIndex];
  if (!current) return jsonError("Unknown playtest id", 404);

  const updatedPlaytest: StoryProjectPlaytestRecord = {
    ...current,
    status: sanitizeStatus(payload.status),
    updatedAt: now,
    sessionId: sanitizeString(payload.sessionId) || current.sessionId,
    summary: sanitizeString(payload.summary) || current.summary,
    firstSceneId: sanitizeString(payload.firstSceneId) || current.firstSceneId,
    firstSceneKey: sanitizeString(payload.firstSceneKey) || current.firstSceneKey,
    firstSceneImageUrl: sanitizeString(payload.firstSceneImageUrl) || current.firstSceneImageUrl,
    sceneCount: payload.sceneCount === undefined ? current.sceneCount : sanitizeCount(payload.sceneCount),
    characterCount:
      payload.characterCount === undefined ? current.characterCount : sanitizeCount(payload.characterCount),
    recordedHistory: sanitizeRecordedHistory(payload.recordedHistory) ?? current.recordedHistory,
    finalStoryState: sanitizeStoryState(payload.finalStoryState) ?? current.finalStoryState,
    notes: sanitizeString(payload.notes) || current.notes,
  };
  nextPlaytests[playtestIndex] = updatedPlaytest;
  const nextActs = project.structure.acts.map((act) =>
    act.id === updatedPlaytest.sourceActId
      ? {
          ...act,
          scenes: act.scenes.map((scene) =>
            scene.id === updatedPlaytest.sourceSceneId
              ? {
                  ...scene,
                  lastPlaytest: {
                    playtestId: updatedPlaytest.id,
                    status: updatedPlaytest.status,
                    updatedAt: updatedPlaytest.updatedAt,
                    sessionId: updatedPlaytest.sessionId,
                    summary: updatedPlaytest.summary,
                    firstSceneId: updatedPlaytest.firstSceneId,
                    firstSceneKey: updatedPlaytest.firstSceneKey,
                    firstSceneImageUrl: updatedPlaytest.firstSceneImageUrl,
                    sceneCount: updatedPlaytest.sceneCount,
                    characterCount: updatedPlaytest.characterCount,
                  },
                }
              : scene,
          ),
        }
      : act,
  );

  const savedProject = await saveStoredStoryProject({
    ...project,
    structure: {
      ...project.structure,
      acts: nextActs,
    },
    playtests: nextPlaytests,
  });

  return NextResponse.json({
    playtest: savedProject.playtests.find((playtest) => playtest.id === playtestId) ?? updatedPlaytest,
    project: savedProject,
  });
}
