import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { KVNamespace } from "@cloudflare/workers-types";
import type { StorySku } from "@/lib/storySku/manifest";

const publishedStorePath = path.join(process.cwd(), ".storyplay", "studio", "published-skus.json");
const publishedKvKey = "studio:published-story-skus:v1";

type StoredPublishedSkuFile = {
  version: 1;
  updatedAt: string;
  skus: Record<string, StorySku>;
};

async function readPublishedSkuFile(): Promise<StoredPublishedSkuFile> {
  try {
    const raw = await readFile(publishedStorePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoredPublishedSkuFile>;
    return {
      version: 1,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
      skus:
        typeof parsed.skus === "object" && parsed.skus !== null && !Array.isArray(parsed.skus)
          ? (parsed.skus as Record<string, StorySku>)
          : {},
    };
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return { version: 1, updatedAt: new Date(0).toISOString(), skus: {} };
    }

    throw error;
  }
}

async function writePublishedSkuFile(skus: Record<string, StorySku>) {
  await mkdir(path.dirname(publishedStorePath), { recursive: true });
  await writeFile(
    publishedStorePath,
    JSON.stringify(
      {
        version: 1,
        updatedAt: new Date().toISOString(),
        skus,
      } satisfies StoredPublishedSkuFile,
      null,
      2,
    ),
    "utf8",
  );
}

function getBoundKv(): KVNamespace | null {
  try {
    const { env } = getCloudflareContext();
    return "KV" in env && env.KV ? env.KV : null;
  } catch {
    return null;
  }
}

async function readPublishedSkuStore(): Promise<StoredPublishedSkuFile> {
  const kv = getBoundKv();
  if (!kv) return readPublishedSkuFile();

  const parsed = await kv.get<Partial<StoredPublishedSkuFile>>(publishedKvKey, "json");
  return {
    version: 1,
    updatedAt: typeof parsed?.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
    skus:
      typeof parsed?.skus === "object" && parsed.skus !== null && !Array.isArray(parsed.skus)
        ? (parsed.skus as Record<string, StorySku>)
        : {},
  };
}

async function writePublishedSkuStore(skus: Record<string, StorySku>) {
  const kv = getBoundKv();
  if (!kv) {
    await writePublishedSkuFile(skus);
    return;
  }

  await kv.put(
    publishedKvKey,
    JSON.stringify({
      version: 1,
      updatedAt: new Date().toISOString(),
      skus,
    } satisfies StoredPublishedSkuFile),
  );
}

export async function listPublishedStorySkus(): Promise<StorySku[]> {
  const file = await readPublishedSkuStore();
  return Object.values(file.skus)
    .filter((sku) => sku.publish.status === "active")
    .sort((a, b) => a.curation.sortOrder - b.curation.sortOrder);
}

export async function listPublishedStorySkusByGender(gender: StorySku["gender"]): Promise<StorySku[]> {
  const skus = await listPublishedStorySkus();
  return skus.filter((sku) => sku.gender === gender && sku.curation.featured);
}

export async function getPublishedStorySku(id: string): Promise<StorySku | null> {
  const file = await readPublishedSkuStore();
  return file.skus[id] ?? null;
}

export async function savePublishedStorySku(sku: StorySku): Promise<StorySku> {
  const file = await readPublishedSkuStore();
  await writePublishedSkuStore({
    ...file.skus,
    [sku.id]: sku,
  });
  return sku;
}

export async function deletePublishedStorySku(id: string): Promise<boolean> {
  const file = await readPublishedSkuStore();
  if (!file.skus[id]) return false;

  const { [id]: _deleted, ...skus } = file.skus;
  await writePublishedSkuStore(skus);
  return true;
}
