import { NextResponse } from "next/server";
import {
  clearStoredStorySkuDrafts,
  listStoredStorySkuDrafts,
  saveStoredStorySkuDraft,
} from "@/lib/storySku/draftStore";
import {
  createStorySkuDraft,
  mergeStoredStorySkuDrafts,
  pickDirtyStorySkuDrafts,
  validateStorySkuDraft,
  type StorySkuDraft,
} from "@/lib/storySku/draft";
import { findManageableStorySku, listManageableStorySkus } from "@/lib/storySku/serverCatalog";
import { requireStudioUser } from "@/lib/storyProject/auth";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const auth = await requireStudioUser();
  if (auth instanceof NextResponse) return auth;

  const skus = await listManageableStorySkus();
  const storedDrafts = await listStoredStorySkuDrafts();
  const mergedDrafts = mergeStoredStorySkuDrafts(skus, storedDrafts);
  const dirtyDrafts = pickDirtyStorySkuDrafts(skus, mergedDrafts);

  return NextResponse.json({
    drafts: dirtyDrafts,
    count: Object.keys(dirtyDrafts).length,
  });
}

export async function PUT(req: Request) {
  const auth = await requireStudioUser();
  if (auth instanceof NextResponse) return auth;

  let draft: StorySkuDraft;
  try {
    const body = (await req.json()) as { draft?: StorySkuDraft };
    if (!body.draft) return jsonError("Missing draft payload");
    draft = body.draft;
  } catch {
    return jsonError("Invalid JSON payload");
  }

  const sku = await findManageableStorySku(draft.id);
  if (!sku) return jsonError("Unknown SKU id", 404);

  const normalizedDraft: StorySkuDraft = {
    ...createStorySkuDraft(sku),
    ...draft,
    id: sku.id,
  };
  const errors = validateStorySkuDraft(normalizedDraft).filter((issue) => issue.severity === "error");
  if (errors.length > 0) {
    return NextResponse.json({ error: "Draft validation failed", issues: errors }, { status: 422 });
  }

  const drafts = await saveStoredStorySkuDraft(normalizedDraft);
  return NextResponse.json({
    draft: normalizedDraft,
    count: Object.keys(drafts).length,
  });
}

export async function DELETE() {
  const auth = await requireStudioUser();
  if (auth instanceof NextResponse) return auth;

  await clearStoredStorySkuDrafts();
  return NextResponse.json({ drafts: {}, count: 0 });
}
