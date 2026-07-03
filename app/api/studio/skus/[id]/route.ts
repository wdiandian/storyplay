import { NextResponse } from "next/server";
import { getStoredStoryProject, saveStoredStoryProject } from "@/lib/storyProject/store";
import { canAccessStoryProject, requireStudioUser } from "@/lib/storyProject/auth";
import { deleteStoredStorySkuDraft } from "@/lib/storySku/draftStore";
import { getPublishedStorySku, deletePublishedStorySku } from "@/lib/storySku/publishedStore";

export const runtime = "nodejs";

type SkuRouteContext = {
  params: Promise<unknown>;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function DELETE(_req: Request, context: SkuRouteContext) {
  const auth = await requireStudioUser();
  if (auth instanceof NextResponse) return auth;

  const params = (await context.params) as { id?: string };
  const id = typeof params.id === "string" ? params.id : "";
  if (!id) return jsonError("Missing SKU id", 400);

  const sku = await getPublishedStorySku(id);

  if (!sku) return jsonError("Unknown published SKU id", 404);
  if (sku.publish.source !== "creator") {
    return jsonError("Preset SKUs cannot be deleted from Studio", 403);
  }
  if (sku.publish.ownerUserId && sku.publish.ownerUserId !== auth.userId) {
    return jsonError("Forbidden SKU", 403);
  }
  if (!sku.publish.ownerUserId && !sku.publish.sourceProjectId) {
    return jsonError("Published SKU is missing source project ownership", 403);
  }

  const project = sku.publish.sourceProjectId
    ? await getStoredStoryProject(sku.publish.sourceProjectId)
    : null;
  if (!sku.publish.ownerUserId && (!project || !canAccessStoryProject(project, auth.userId))) {
    return jsonError("Forbidden SKU", 403);
  }

  const deleted = await deletePublishedStorySku(id);
  if (!deleted) return jsonError("Unknown published SKU id", 404);

  await deleteStoredStorySkuDraft(id);

  let savedProject = null;
  if (sku.publish.sourceProjectId) {
    if (project && project.publish.skuId === id) {
      savedProject = await saveStoredStoryProject({
        ...project,
        publish: {
          status: "draft",
          skuId: "",
        },
      });
    }
  }

  return NextResponse.json({ deleted: true, id, project: savedProject });
}
