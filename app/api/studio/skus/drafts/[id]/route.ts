import { NextResponse } from "next/server";
import { deleteStoredStorySkuDraft } from "@/lib/storySku/draftStore";
import { findManageableStorySku } from "@/lib/storySku/serverCatalog";

export const runtime = "nodejs";

type DraftRouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_req: Request, context: DraftRouteContext) {
  const { id } = await context.params;
  const sku = await findManageableStorySku(id);
  if (!sku) {
    return NextResponse.json({ error: "Unknown SKU id" }, { status: 404 });
  }

  const drafts = await deleteStoredStorySkuDraft(id);
  return NextResponse.json({
    drafts,
    count: Object.keys(drafts).length,
  });
}
