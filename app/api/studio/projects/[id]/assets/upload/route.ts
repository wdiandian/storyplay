import { NextResponse } from "next/server";
import {
  buildStudioAssetKey,
  storeStudioAsset,
} from "@/lib/storyProject/assetStorage";
import { getStoredStoryProject } from "@/lib/storyProject/store";
import type { StoryProjectAssetKind } from "@/lib/storyProject/types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const allowedKinds = new Set<StoryProjectAssetKind>([
  "cover",
  "first-scene",
  "character-reference",
  "style-reference",
  "runtime-scene",
]);

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function readKind(value: FormDataEntryValue | null): StoryProjectAssetKind | undefined {
  return typeof value === "string" && allowedKinds.has(value as StoryProjectAssetKind)
    ? (value as StoryProjectAssetKind)
    : undefined;
}

function readString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const project = await getStoredStoryProject(id);
  if (!project) return jsonError("Unknown project id", 404);

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return jsonError("Invalid multipart payload");
  }

  const kind = readKind(formData.get("kind"));
  if (!kind) return jsonError("Invalid asset kind");

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return jsonError("file is required");
  }

  try {
    const contentType = file.type || "image/webp";
    const key = buildStudioAssetKey({
      projectId: id,
      kind,
      name: readString(formData.get("name")) || file.name,
      contentType,
    });
    const stored = await storeStudioAsset({
      key,
      data: new Uint8Array(await file.arrayBuffer()),
      contentType,
    });

    return NextResponse.json({
      asset: {
        kind,
        imageUrl: stored.url,
        key: stored.key,
        contentType: stored.contentType,
        size: stored.size,
        source: "uploaded",
        status: "ready",
      },
    });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Asset upload failed", 500);
  }
}
