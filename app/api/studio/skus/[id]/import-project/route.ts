import { NextResponse } from "next/server";
import { saveStoredStoryProject } from "@/lib/storyProject/store";
import { createStoryProjectFromPresetSkuId } from "@/lib/storyProject/importPreset";
import { assignStoryProjectOwner, requireStudioUser } from "@/lib/storyProject/auth";

export const runtime = "nodejs";

type ImportPresetRouteContext = {
  params: Promise<unknown>;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(_req: Request, context: ImportPresetRouteContext) {
  const auth = await requireStudioUser();
  if (auth instanceof NextResponse) return auth;

  const params = (await context.params) as { id?: string };
  const id = typeof params.id === "string" ? params.id : "";
  if (!id) return jsonError("Missing SKU id", 400);

  const project = await createStoryProjectFromPresetSkuId(id);
  if (!project) return jsonError("Preset SKU cannot be imported", 404);

  const savedProject = await saveStoredStoryProject(assignStoryProjectOwner(project, auth.userId));
  return NextResponse.json({ project: savedProject }, { status: 201 });
}
