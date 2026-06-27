import "server-only";

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { KVNamespace } from "@cloudflare/workers-types";
import type { StorySkuDraft } from "@/lib/storySku/draft";

const draftStorePath = path.join(process.cwd(), ".storyplay", "studio", "sku-drafts.json");
const draftKvKey = "studio:story-sku-drafts:v1";

export type StorySkuDraftStoreProvider = "file" | "kv";

export type StorySkuDraftStore = {
  provider: StorySkuDraftStoreProvider;
  listDrafts: () => Promise<Record<string, StorySkuDraft>>;
  saveDraft: (draft: StorySkuDraft) => Promise<Record<string, StorySkuDraft>>;
  deleteDraft: (id: string) => Promise<Record<string, StorySkuDraft>>;
  clearDrafts: () => Promise<void>;
};

type StoredDraftFile = {
  version: 1;
  updatedAt: string;
  drafts: Record<string, StorySkuDraft>;
};

async function readDraftFile(): Promise<StoredDraftFile> {
  try {
    const raw = await readFile(draftStorePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoredDraftFile>;
    return {
      version: 1,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
      drafts:
        typeof parsed.drafts === "object" && parsed.drafts !== null && !Array.isArray(parsed.drafts)
          ? (parsed.drafts as Record<string, StorySkuDraft>)
          : {},
    };
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return { version: 1, updatedAt: new Date(0).toISOString(), drafts: {} };
    }

    throw error;
  }
}

async function writeDraftFile(drafts: Record<string, StorySkuDraft>) {
  await mkdir(path.dirname(draftStorePath), { recursive: true });
  await writeFile(
    draftStorePath,
    JSON.stringify(
      {
        version: 1,
        updatedAt: new Date().toISOString(),
        drafts,
      } satisfies StoredDraftFile,
      null,
      2,
    ),
    "utf8",
  );
}

export async function listStoredStorySkuDrafts(): Promise<Record<string, StorySkuDraft>> {
  return getStorySkuDraftStore().listDrafts();
}

export async function saveStoredStorySkuDraft(draft: StorySkuDraft): Promise<Record<string, StorySkuDraft>> {
  return getStorySkuDraftStore().saveDraft(draft);
}

export async function deleteStoredStorySkuDraft(id: string): Promise<Record<string, StorySkuDraft>> {
  return getStorySkuDraftStore().deleteDraft(id);
}

export async function clearStoredStorySkuDrafts(): Promise<void> {
  return getStorySkuDraftStore().clearDrafts();
}

class FileStorySkuDraftStore implements StorySkuDraftStore {
  provider: StorySkuDraftStoreProvider = "file";

  async listDrafts(): Promise<Record<string, StorySkuDraft>> {
    const file = await readDraftFile();
    return file.drafts;
  }

  async saveDraft(draft: StorySkuDraft): Promise<Record<string, StorySkuDraft>> {
    const file = await readDraftFile();
    const drafts = {
      ...file.drafts,
      [draft.id]: draft,
    };
    await writeDraftFile(drafts);
    return drafts;
  }

  async deleteDraft(id: string): Promise<Record<string, StorySkuDraft>> {
    const file = await readDraftFile();
    const { [id]: _deleted, ...drafts } = file.drafts;
    await writeDraftFile(drafts);
    return drafts;
  }

  async clearDrafts(): Promise<void> {
    try {
      await rm(draftStorePath, { force: true });
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as NodeJS.ErrnoException).code === "ENOENT"
      ) {
        return;
      }

      throw error;
    }
  }
}

const fileStorySkuDraftStore = new FileStorySkuDraftStore();

class KvStorySkuDraftStore implements StorySkuDraftStore {
  provider: StorySkuDraftStoreProvider = "kv";

  constructor(private readonly kv: KVNamespace) {}

  private async readFile(): Promise<StoredDraftFile> {
    const parsed = await this.kv.get<Partial<StoredDraftFile>>(draftKvKey, "json");
    return {
      version: 1,
      updatedAt: typeof parsed?.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
      drafts:
        typeof parsed?.drafts === "object" && parsed.drafts !== null && !Array.isArray(parsed.drafts)
          ? (parsed.drafts as Record<string, StorySkuDraft>)
          : {},
    };
  }

  private async writeFile(drafts: Record<string, StorySkuDraft>) {
    await this.kv.put(
      draftKvKey,
      JSON.stringify({
        version: 1,
        updatedAt: new Date().toISOString(),
        drafts,
      } satisfies StoredDraftFile),
    );
  }

  async listDrafts(): Promise<Record<string, StorySkuDraft>> {
    const file = await this.readFile();
    return file.drafts;
  }

  async saveDraft(draft: StorySkuDraft): Promise<Record<string, StorySkuDraft>> {
    const file = await this.readFile();
    const drafts = {
      ...file.drafts,
      [draft.id]: draft,
    };
    await this.writeFile(drafts);
    return drafts;
  }

  async deleteDraft(id: string): Promise<Record<string, StorySkuDraft>> {
    const file = await this.readFile();
    const { [id]: _deleted, ...drafts } = file.drafts;
    await this.writeFile(drafts);
    return drafts;
  }

  async clearDrafts(): Promise<void> {
    await this.kv.delete(draftKvKey);
  }
}

function getBoundKv(): KVNamespace | null {
  try {
    const { env } = getCloudflareContext();
    return "KV" in env && env.KV ? env.KV : null;
  } catch {
    return null;
  }
}

export function getStorySkuDraftStore(): StorySkuDraftStore {
  const kv = getBoundKv();
  if (kv) return new KvStorySkuDraftStore(kv);
  return fileStorySkuDraftStore;
}
