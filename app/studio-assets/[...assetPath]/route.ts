import { readFile, stat } from "node:fs/promises";
import { NextResponse } from "next/server";
import { resolveStudioAssetPath } from "@/lib/storyProject/assetStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ assetPath?: string[] }>;
};

function contentTypeForPath(filePath: string) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "application/octet-stream";
}

export async function GET(_req: Request, context: RouteContext) {
  const { assetPath = [] } = await context.params;
  if (assetPath.length === 0) {
    return NextResponse.json({ error: "Asset path is required" }, { status: 400 });
  }

  let absolutePath: string;
  try {
    absolutePath = resolveStudioAssetPath(assetPath).absolutePath;
  } catch {
    return NextResponse.json({ error: "Invalid asset path" }, { status: 400 });
  }

  try {
    const info = await stat(absolutePath);
    if (!info.isFile()) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
    const data = await readFile(absolutePath);
    return new Response(data, {
      headers: {
        "Content-Type": contentTypeForPath(absolutePath),
        "Content-Length": String(info.size),
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  } catch {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
}
