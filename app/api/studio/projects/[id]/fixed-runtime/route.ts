import { NextResponse } from "next/server";
import { createFixedRuntimePackageFromPlaytest } from "@/lib/storyProject/fixedRuntime";
import {
  getStoredStoryProject,
  saveStoredStoryProject,
} from "@/lib/storyProject/store";

export const runtime = "nodejs";

type FixedRuntimeRouteContext = {
  params: Promise<{ id: string }>;
};

type CreateFixedRuntimePayload = {
  playtestId?: string;
  title?: string;
  notes?: string;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request, context: FixedRuntimeRouteContext) {
  const { id } = await context.params;
  const project = await getStoredStoryProject(id);
  if (!project) return jsonError("Unknown project id", 404);

  let payload: CreateFixedRuntimePayload;
  try {
    payload = (await req.json()) as CreateFixedRuntimePayload;
  } catch {
    return jsonError("Invalid JSON payload");
  }

  const playtestId = typeof payload.playtestId === "string" ? payload.playtestId.trim() : "";
  const playtest = project.playtests.find((item) => item.id === playtestId);
  if (!playtest) return jsonError("Unknown playtest id", 404);
  if (playtest.recordedHistory.length === 0) {
    return jsonError("Playtest has no recorded runtime history yet", 409);
  }

  const pkg = createFixedRuntimePackageFromPlaytest(project, playtest, {
    title: payload.title,
    notes: payload.notes,
  });
  const savedProject = await saveStoredStoryProject({
    ...project,
    fixedRuntimePackages: [pkg, ...project.fixedRuntimePackages].slice(0, 10),
  });

  return NextResponse.json({
    fixedRuntimePackage: savedProject.fixedRuntimePackages.find((item) => item.id === pkg.id) ?? pkg,
    project: savedProject,
  });
}
