import { NextResponse } from "next/server";
import { buildStorySkuFromProject } from "@/lib/storyProject/publish";
import {
  getStoredStoryProject,
  saveStoredStoryProject,
} from "@/lib/storyProject/store";
import { validateStoryProject } from "@/lib/storyProject/types";
import { savePublishedStorySku } from "@/lib/storySku/publishedStore";

export const runtime = "nodejs";

type ProjectPublishRouteContext = {
  params: Promise<{ id: string }>;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(_req: Request, context: ProjectPublishRouteContext) {
  const { id } = await context.params;
  const project = await getStoredStoryProject(id);
  if (!project) return jsonError("Unknown project id", 404);

  const issues = validateStoryProject(project);
  if (issues.length > 0) {
    return NextResponse.json({ error: "Project validation failed", issues }, { status: 422 });
  }

  const build = buildStorySkuFromProject(project);
  const sku = await savePublishedStorySku(build.sku);
  const savedProject = await saveStoredStoryProject({
    ...project,
    generation: {
      ...project.generation,
      status: "ready",
      lastGeneratedAt: new Date().toISOString(),
      message: build.warnings.length > 0 ? "Published with runtime warnings" : "Published",
    },
    publish: {
      status: "published",
      skuId: sku.id,
    },
  });

  return NextResponse.json({
    sku,
    project: savedProject,
    warnings: build.warnings,
  });
}
