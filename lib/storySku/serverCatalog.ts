import "server-only";

import { listAllStorySkus, type StorySku } from "@/lib/storySku/manifest";
import { listPublishedStorySkus } from "@/lib/storySku/publishedStore";

export async function listManageableStorySkus(): Promise<StorySku[]> {
  const presets = listAllStorySkus();
  const published = await listPublishedStorySkus();
  const presetIds = new Set(presets.map((sku) => sku.id));
  const creatorSkus = published.filter((sku) => !presetIds.has(sku.id));

  return [...creatorSkus, ...presets];
}

export async function findManageableStorySku(id: string): Promise<StorySku | undefined> {
  const skus = await listManageableStorySkus();
  return skus.find((sku) => sku.id === id);
}
