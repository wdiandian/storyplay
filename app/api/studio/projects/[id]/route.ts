import { NextResponse } from "next/server";
import {
  deleteStoredStoryProject,
  getStoredStoryProject,
  saveStoredStoryProject,
} from "@/lib/storyProject/store";
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
  const project = await getStoredStoryProject(id);
  if (!project) return jsonError("Unknown project id", 404);

  return NextResponse.json({ project });
}

export async function PUT(req: Request, context: ProjectRouteContext) {
  const { id } = await context.params;
  const existingProject = await getStoredStoryProject(id);
  if (!existingProject) return jsonError("Unknown project id", 404);

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
  const deleted = await deleteStoredStoryProject(id);
  if (!deleted) return jsonError("Unknown project id", 404);

  return NextResponse.json({ deleted: true });
}
