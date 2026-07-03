import { NextResponse } from "next/server";
import {
  createStoryProject,
  validateStoryProject,
  type StoryProjectCreateInput,
} from "@/lib/storyProject/types";
import {
  listStoredStoryProjects,
  saveStoredStoryProject,
} from "@/lib/storyProject/store";
import {
  filterStoryProjectsForUser,
  requireStudioUser,
} from "@/lib/storyProject/auth";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const auth = await requireStudioUser();
  if (auth instanceof NextResponse) return auth;

  const projects = filterStoryProjectsForUser(
    await listStoredStoryProjects(),
    auth.userId,
  );
  return NextResponse.json({
    projects,
    count: projects.length,
  });
}

export async function POST(req: Request) {
  const auth = await requireStudioUser();
  if (auth instanceof NextResponse) return auth;

  let input: StoryProjectCreateInput;
  try {
    input = (await req.json()) as StoryProjectCreateInput;
  } catch {
    return jsonError("Invalid JSON payload");
  }

  if (!input.title?.trim()) {
    return NextResponse.json(
      {
        error: "Project validation failed",
        issues: [{ field: "title", message: "请输入故事工程标题" }],
      },
      { status: 422 },
    );
  }

  const project = createStoryProject({
    ...input,
    ownerUserId: auth.userId,
  });
  const issues = validateStoryProject(project);
  if (issues.length > 0) {
    return NextResponse.json({ error: "Project validation failed", issues }, { status: 422 });
  }

  const savedProject = await saveStoredStoryProject(project);
  return NextResponse.json({ project: savedProject }, { status: 201 });
}
