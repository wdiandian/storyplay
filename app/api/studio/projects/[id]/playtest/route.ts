import { NextResponse } from "next/server";
import { compileStoryProjectToStartRequest } from "@/lib/storyProject/compiler";
import {
  saveStoredStoryProject,
} from "@/lib/storyProject/store";
import { requireOwnedStoryProject } from "@/lib/storyProject/auth";
import { createStoryProjectPlaytestId, type StoryProjectPlaytestRecord } from "@/lib/storyProject/types";

export const runtime = "nodejs";

type ProjectPlaytestRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_req: Request, context: ProjectPlaytestRouteContext) {
  const { id } = await context.params;
  const owned = await requireOwnedStoryProject(id);
  if (owned instanceof NextResponse) return owned;
  const project = owned.project;

  const build = compileStoryProjectToStartRequest(project);
  const now = new Date().toISOString();
  const playtest: StoryProjectPlaytestRecord = {
    id: createStoryProjectPlaytestId(),
    status: "created",
    createdAt: now,
    updatedAt: now,
    sourceProjectUpdatedAt: project.updatedAt,
    sourceActId: build.sourceActId,
    sourceSceneId: build.sourceSceneId,
    startRequest: build.startRequest,
    warnings: build.warnings,
    sessionId: "",
    summary: "",
    firstSceneId: "",
    firstSceneKey: "",
    firstSceneImageUrl: "",
    sceneCount: 0,
    characterCount: 0,
    recordedHistory: [],
    finalStoryState: undefined,
    notes: "",
  };
  const savedProject = await saveStoredStoryProject({
    ...project,
    generation: {
      ...project.generation,
      status: "ready",
      lastGeneratedAt: now,
      message: build.warnings.length > 0 ? "Playtest payload built with warnings" : "Playtest payload built",
    },
    publish: {
      ...project.publish,
      status: project.publish.status === "published" ? "published" : "playtest",
    },
    playtests: [playtest, ...project.playtests].slice(0, 20),
  });

  return NextResponse.json({
    build,
    playtest,
    project: savedProject,
  });
}
