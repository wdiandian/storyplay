import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { AUTH_ENABLED } from "@/lib/supabase/config";
import type {
  CharacterSaveInput,
  SceneSaveInput,
  StoryLoadResult,
  StoryMeta,
  StorySaveInput,
} from "@/lib/db/repositories/storyRepo";

const storyStorePath = path.join(process.cwd(), ".storyplay", "stories", "saved-stories.json");

type StoredStoryFile = {
  version: 1;
  updatedAt: string;
  stories: Record<string, StoredStoryRecord>;
};

type StoredStoryRecord = {
  story: Omit<StoryLoadResult["story"], "createdAt" | "updatedAt"> & {
    createdAt: string;
    updatedAt: string;
  };
  scenes: Array<Omit<StoryLoadResult["scenes"][number], "createdAt"> & { createdAt: string }>;
  characters: StoryLoadResult["characters"];
};

function canAccessStory(record: StoredStoryRecord, userId: string) {
  if (!AUTH_ENABLED || userId === "anonymous") return true;
  return record.story.userId === userId;
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function normalizeRecord(record: StoredStoryRecord): StoryLoadResult {
  return {
    story: {
      ...record.story,
      createdAt: toDate(record.story.createdAt),
      updatedAt: toDate(record.story.updatedAt),
    },
    scenes: record.scenes.map((scene) => ({
      ...scene,
      createdAt: toDate(scene.createdAt),
    })),
    characters: record.characters,
  };
}

function serializeResult(result: StoryLoadResult): StoredStoryRecord {
  return {
    story: {
      ...result.story,
      createdAt: result.story.createdAt.toISOString(),
      updatedAt: result.story.updatedAt.toISOString(),
    },
    scenes: result.scenes.map((scene) => ({
      ...scene,
      createdAt: scene.createdAt.toISOString(),
    })),
    characters: result.characters,
  };
}

async function readStoryFile(): Promise<StoredStoryFile> {
  try {
    const raw = await readFile(storyStorePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoredStoryFile>;
    return {
      version: 1,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
      stories:
        typeof parsed.stories === "object" && parsed.stories !== null && !Array.isArray(parsed.stories)
          ? (parsed.stories as Record<string, StoredStoryRecord>)
          : {},
    };
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return { version: 1, updatedAt: new Date(0).toISOString(), stories: {} };
    }

    throw error;
  }
}

async function writeStoryFile(stories: Record<string, StoredStoryRecord>) {
  await mkdir(path.dirname(storyStorePath), { recursive: true });
  await writeFile(
    storyStorePath,
    JSON.stringify(
      {
        version: 1,
        updatedAt: new Date().toISOString(),
        stories,
      } satisfies StoredStoryFile,
      null,
      2,
    ),
    "utf8",
  );
}

export async function saveStoredStory(
  input: StorySaveInput,
  sceneInputs: SceneSaveInput[],
  characterInputs: CharacterSaveInput[],
  userId: string,
): Promise<{ storyId: string } | "forbidden"> {
  const file = await readStoryFile();
  const existing = file.stories[input.id];
  if (existing && !canAccessStory(existing, userId)) return "forbidden";

  const now = new Date();
  const createdAt = existing ? toDate(existing.story.createdAt) : now;
  const result: StoryLoadResult = {
    story: {
      id: input.id,
      userId,
      worldSetting: input.worldSetting,
      styleGuide: input.styleGuide,
      styleReferenceImage: input.styleReferenceImage,
      orientation: input.orientation,
      storyState: input.storyState,
      status: input.status ?? "active",
      createdAt,
      updatedAt: now,
    },
    scenes: sceneInputs.map((scene, idx) => ({
      id: scene.id,
      sceneKey: scene.sceneKey,
      sceneSummary: scene.sceneSummary,
      imageUrl: scene.imageUrl,
      beats: scene.beats,
      orientation: scene.orientation,
      sortOrder: scene.sortOrder ?? idx,
      createdAt: now,
    })),
    characters: characterInputs.map((character) => ({
      name: character.name,
      visualDescription: character.visualDescription,
      voiceDescription: character.voiceDescription,
      portrait: character.portrait,
      voice: character.voice,
    })),
  };

  await writeStoryFile({
    ...file.stories,
    [input.id]: serializeResult(result),
  });

  return { storyId: input.id };
}

export async function listStoredStoriesForUser(userId: string, limit = 50): Promise<StoryMeta[]> {
  const file = await readStoryFile();
  return Object.values(file.stories)
    .filter((record) => canAccessStory(record, userId))
    .map((record) => {
      const story = normalizeRecord(record);
      return {
        id: story.story.id,
        userId: story.story.userId,
        worldSetting: story.story.worldSetting,
        styleGuide: story.story.styleGuide,
        orientation: story.story.orientation,
        status: story.story.status,
        sceneCount: story.scenes.length,
        createdAt: story.story.createdAt,
        updatedAt: story.story.updatedAt,
      };
    })
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, limit);
}

export async function getStoredStoryForUser(storyId: string, userId: string): Promise<StoryLoadResult | null | "forbidden"> {
  const file = await readStoryFile();
  const record = file.stories[storyId];
  if (!record) return null;
  if (!canAccessStory(record, userId)) return "forbidden";
  return normalizeRecord(record);
}

export async function deleteStoredStoryForUser(storyId: string, userId: string): Promise<boolean | "forbidden"> {
  const file = await readStoryFile();
  const record = file.stories[storyId];
  if (!record) return false;
  if (!canAccessStory(record, userId)) return "forbidden";

  const { [storyId]: _deleted, ...stories } = file.stories;
  await writeStoryFile(stories);
  return true;
}
