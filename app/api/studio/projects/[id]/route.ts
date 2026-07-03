import { NextResponse } from "next/server";
import {
  deleteStoredStoryProject,
  saveStoredStoryProject,
} from "@/lib/storyProject/store";
import { requireOwnedStoryProject } from "@/lib/storyProject/auth";
import {
  normalizeStoryProject,
  validateStoryProject,
  type StoryProject,
} from "@/lib/storyProject/types";

export const runtime = "nodejs";

type ProjectRouteContext = {
  params: Promise<{ id: string }>;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(_req: Request, context: ProjectRouteContext) {
  const { id } = await context.params;
  const owned = await requireOwnedStoryProject(id);
  if (owned instanceof NextResponse) return owned;

  return NextResponse.json({ project: owned.project });
}

export async function PUT(req: Request, context: ProjectRouteContext) {
  const { id } = await context.params;
  const owned = await requireOwnedStoryProject(id);
  if (owned instanceof NextResponse) return owned;
  const existingProject = owned.project;

  let payload: { project?: StoryProject } | StoryProject;
  try {
    payload = (await req.json()) as { project?: StoryProject } | StoryProject;
  } catch {
    return jsonError("Invalid JSON payload");
  }

  const incomingProject = "project" in payload && payload.project ? payload.project : payload;
  const normalizedProject = normalizeStoryProject({
    ...existingProject,
    ...incomingProject,
    id,
    ownerUserId: existingProject.ownerUserId || owned.userId,
    createdAt: existingProject.createdAt,
  } as StoryProject);
  const issues = validateStoryProject(normalizedProject);
  if (issues.length > 0) {
    return NextResponse.json({ error: "Project validation failed", issues }, { status: 422 });
  }

  const savedProject = await saveStoredStoryProject(normalizedProject);
  return NextResponse.json({ project: savedProject });
}

export async function DELETE(_req: Request, context: ProjectRouteContext) {
  const { id } = await context.params;
  const owned = await requireOwnedStoryProject(id);
  if (owned instanceof NextResponse) return owned;

  const deleted = await deleteStoredStoryProject(id);
  if (!deleted) return jsonError("Unknown project id", 404);

  return NextResponse.json({ deleted: true });
}
