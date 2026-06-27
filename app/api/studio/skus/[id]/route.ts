import { NextResponse } from "next/server";
import { getStoredStoryProject, saveStoredStoryProject } from "@/lib/storyProject/store";
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
  const params = (await context.params) as { id?: string };
  const id = typeof params.id === "string" ? params.id : "";
  if (!id) return jsonError("Missing SKU id", 400);

  const sku = await getPublishedStorySku(id);

  if (!sku) return jsonError("Unknown published SKU id", 404);
  if (sku.publish.source !== "creator") {
    return jsonError("Preset SKUs cannot be deleted from Studio", 403);
  }

  const deleted = await deletePublishedStorySku(id);
  if (!deleted) return jsonError("Unknown published SKU id", 404);

  await deleteStoredStorySkuDraft(id);

  let savedProject = null;
  if (sku.publish.sourceProjectId) {
    const project = await getStoredStoryProject(sku.publish.sourceProjectId);
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
