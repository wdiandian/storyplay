import { NextResponse } from "next/server";
import { buildStorySkuFromProject } from "@/lib/storyProject/publish";
import {
  saveStoredStoryProject,
} from "@/lib/storyProject/store";
import { requireOwnedStoryProject } from "@/lib/storyProject/auth";
import { validateStoryProject } from "@/lib/storyProject/types";
import { savePublishedStorySku } from "@/lib/storySku/publishedStore";

export const runtime = "nodejs";

type ProjectPublishRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_req: Request, context: ProjectPublishRouteContext) {
  const { id } = await context.params;
  const owned = await requireOwnedStoryProject(id);
  if (owned instanceof NextResponse) return owned;
  const project = owned.project;

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
