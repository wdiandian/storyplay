import "server-only";

import { NextResponse } from "next/server";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import { requireUser } from "@/lib/supabase/guard";
import { getStoredStoryProject } from "@/lib/storyProject/store";
import type { StoryProject } from "@/lib/storyProject/types";

export type StudioUser = {
  userId: string;
};

export type OwnedStoryProject = {
  userId: string;
  project: StoryProject;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireStudioUser(): Promise<StudioUser | NextResponse> {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  return auth;
}

export async function getStudioUserOrNull(): Promise<StudioUser | null> {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return null;
  return auth;
}

export function canAccessStoryProject(project: StoryProject, userId: string) {
  if (!AUTH_ENABLED || userId === "anonymous") return true;
  return project.ownerUserId === userId;
}

export function filterStoryProjectsForUser(projects: StoryProject[], userId: string) {
  if (!AUTH_ENABLED || userId === "anonymous") return projects;
  return projects.filter((project) => project.ownerUserId === userId);
}

export async function requireOwnedStoryProject(id: string): Promise<OwnedStoryProject | NextResponse> {
  const auth = await requireStudioUser();
  if (auth instanceof NextResponse) return auth;

  const project = await getStoredStoryProject(id);
  if (!project) return jsonError("Unknown project id", 404);
  if (!canAccessStoryProject(project, auth.userId)) {
    return jsonError("Forbidden project", 403);
  }

  return {
    userId: auth.userId,
    project,
  };
}

export function assignStoryProjectOwner(project: StoryProject, userId: string): StoryProject {
  if (project.ownerUserId) return project;
  return {
    ...project,
    ownerUserId: userId,
  };
}
