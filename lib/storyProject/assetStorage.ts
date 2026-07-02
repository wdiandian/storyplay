import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StoryProjectAssetKind } from "@/lib/storyProject/types";

export type StoredStudioAsset = {
  url: string;
  key: string;
  contentType: string;
  size: number;
};

const DEFAULT_PUBLIC_BASE = "/studio-assets";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function sanitizeSegment(value: string, fallback = "asset") {
  const cleaned = value
    .trim()
    .replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
  return cleaned || fallback;
}

function extensionFromContentType(contentType: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "webp";
}

function assertImage(contentType: string, size: number) {
  if (!contentType.startsWith("image/")) {
    throw new Error("Only image assets are supported.");
  }
  if (size <= 0) {
    throw new Error("Image asset is empty.");
  }
  if (size > MAX_IMAGE_BYTES) {
    throw new Error(`Image asset exceeds ${MAX_IMAGE_BYTES} bytes.`);
  }
}

export function localAssetRoot() {
  return path.resolve(process.cwd(), "public", "studio-assets");
}

export function resolveStudioAssetPath(key: string | string[]) {
  const root = localAssetRoot();
  const segments = Array.isArray(key) ? key : key.split(/[\\/]+/);
  const relativePath = segments.filter(Boolean).join(path.sep);
  const absolutePath = path.resolve(root, relativePath);
  if (absolutePath !== root && !absolutePath.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid asset key.");
  }
  return { root, absolutePath };
}

function publicBaseUrl() {
  return (process.env.STUDIO_ASSET_PUBLIC_BASE_URL || DEFAULT_PUBLIC_BASE).replace(/\/$/, "");
}

function publicAssetUrl(key: string) {
  const encodedKey = key
    .split(/[\\/]+/)
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  return `${publicBaseUrl()}/${encodedKey}`;
}

export function buildStudioAssetKey(input: {
  projectId: string;
  kind: StoryProjectAssetKind;
  name?: string;
  contentType: string;
}) {
  const projectId = sanitizeSegment(input.projectId, "project");
  const kind = sanitizeSegment(input.kind, "asset");
  const name = sanitizeSegment(input.name || `${kind}_${Date.now().toString(36)}`);
  const ext = extensionFromContentType(input.contentType);
  return `${projectId}/${kind}/${name}_${Date.now().toString(36)}.${ext}`;
}

export async function storeStudioAsset(input: {
  key: string;
  data: Buffer | Uint8Array;
  contentType: string;
}): Promise<StoredStudioAsset> {
  assertImage(input.contentType, input.data.byteLength);

  const { absolutePath } = resolveStudioAssetPath(input.key);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, input.data);

  return {
    key: input.key,
    url: publicAssetUrl(input.key),
    contentType: input.contentType,
    size: input.data.byteLength,
  };
}

export async function storeStudioAssetFromUrl(input: {
  url: string;
  key: string;
}): Promise<StoredStudioAsset> {
  const response = await fetch(input.url);
  if (!response.ok) {
    throw new Error(`Failed to fetch generated image: HTTP ${response.status}`);
  }
  const contentType = response.headers.get("content-type") || "image/webp";
  const data = new Uint8Array(await response.arrayBuffer());
  return storeStudioAsset({ key: input.key, data, contentType });
}

export async function storeStudioAssetFromDataUrl(input: {
  dataUrl: string;
  key: string;
}): Promise<StoredStudioAsset> {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(input.dataUrl);
  if (!match) {
    throw new Error("Invalid image data URL.");
  }
  const contentType = match[1]!;
  const data = Buffer.from(match[2]!, "base64");
  return storeStudioAsset({ key: input.key, data, contentType });
}
