import type { Session } from "@storyplay/types";
import type {
  CharacterSaveInput,
  SceneSaveInput,
  StoryLoadResult,
  StoryMeta,
  StorySaveInput,
} from "@/lib/db/repositories/storyRepo";

const USER_ID_KEY = "storyplay:userId";
const SAVE_FALLBACK_KEY = "storyplay:savedStories";

type LocalStorageEntry = {
  id: string;
  worldSetting: string;
  styleGuide: string;
  sceneCount: number;
  savedAt: number;
  sessionJson: string;
};

export function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(USER_ID_KEY);
    if (!id) {
      id = `anon_${crypto.randomUUID()}`;
      window.localStorage.setItem(USER_ID_KEY, id);
    }
    return id;
  } catch {
    return `anon_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

export function sessionToSaveInput(session: Session): {
  story: StorySaveInput;
  scenes: SceneSaveInput[];
  characters: CharacterSaveInput[];
} {
  const story: StorySaveInput = {
    id: session.id,
    userId: getOrCreateUserId(),
    worldSetting: session.worldSetting,
    styleGuide: session.styleGuide,
    styleReferenceImage: session.styleReferenceImage,
    orientation: (session.orientation as "portrait" | "landscape") ?? "landscape",
    storyState: session.storyState,
    status: "active",
  };

  const scenes: SceneSaveInput[] = (session.history ?? []).map((entry, idx) => ({
    id: entry.scene.id,
    sceneKey: entry.scene.sceneKey,
    sceneSummary: entry.scene.scenePrompt,
    imageUrl: entry.scene.imageUrl ?? "",
    beats: entry.scene.beats,
    orientation: entry.scene.orientation,
    sortOrder: idx,
  }));

  const characters: CharacterSaveInput[] = (session.characters ?? []).map((character) => ({
    name: character.name,
    visualDescription: character.visualDescription,
    voiceDescription: character.voiceDescription,
    portrait:
      character.basePortraitUrl || character.basePortraitUuid
        ? { url: character.basePortraitUrl, uuid: character.basePortraitUuid }
        : undefined,
    voice: character.voice,
  }));

  return { story, scenes, characters };
}

export type SaveResult =
  | { ok: true; storyId: string; source: "server" }
  | { ok: true; storyId: string; source: "localStorage" }
  | { ok: false; error: string };

export async function saveStory(session: Session): Promise<SaveResult> {
  const { story, scenes, characters } = sessionToSaveInput(session);

  try {
    const res = await fetch("/api/stories/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ story, scenes, characters }),
    });

    if (res.ok) {
      const data = (await res.json()) as { storyId: string };
      return { ok: true, storyId: data.storyId, source: "server" };
    }
  } catch {
    // Keep the play flow working when server persistence is unavailable.
  }

  return saveToLocalStorage(session);
}

function slimSessionForStorage(session: Session): Session {
  return {
    ...session,
    styleReferenceImage: undefined,
    characters: session.characters.map((character) => ({
      ...character,
      voice: undefined,
    })),
  };
}

function saveToLocalStorage(session: Session): SaveResult {
  try {
    const existing = loadFromLocalStorageAll();
    const entry: LocalStorageEntry = {
      id: session.id,
      worldSetting: session.worldSetting,
      styleGuide: session.styleGuide,
      sceneCount: session.history?.length ?? 0,
      savedAt: Date.now(),
      sessionJson: JSON.stringify(slimSessionForStorage(session)),
    };
    const updated = [entry, ...existing.filter((item) => item.id !== session.id)].slice(0, 20);
    window.localStorage.setItem(SAVE_FALLBACK_KEY, JSON.stringify(updated));
    return { ok: true, storyId: session.id, source: "localStorage" };
  } catch {
    return { ok: false, error: "无法保存到本地存储。" };
  }
}

export async function loadStoryList(): Promise<StoryMeta[]> {
  const localStories = localEntriesToStoryMeta(loadFromLocalStorageAll());

  try {
    const res = await fetch("/api/stories/list");
    if (!res.ok) return localStories;

    const data = (await res.json()) as { stories?: StoryMeta[] };
    const serverStories = Array.isArray(data.stories) ? data.stories : [];
    const localOnly = localStories.filter(
      (localStory) => !serverStories.some((serverStory) => serverStory.id === localStory.id),
    );
    return [...serverStories, ...localOnly];
  } catch {
    return localStories;
  }
}

export async function loadStory(storyId: string): Promise<StoryLoadResult | null> {
  try {
    const res = await fetch(`/api/stories/${encodeURIComponent(storyId)}`);
    if (res.ok) return (await res.json()) as StoryLoadResult;
  } catch {
    // Fall through to localStorage.
  }

  const localSession = loadFromLocalStorage(storyId);
  return localSession ? sessionToStoryLoadResult(localSession) : null;
}

export async function deleteStory(storyId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/stories/${encodeURIComponent(storyId)}`, {
      method: "DELETE",
    });
    if (res.ok) return true;
  } catch {
    // Fall through to localStorage.
  }

  return deleteFromLocalStorage(storyId);
}

function deleteFromLocalStorage(storyId: string): boolean {
  try {
    const existing = loadFromLocalStorageAll();
    const updated = existing.filter((entry) => entry.id !== storyId);
    if (updated.length === existing.length) return false;
    window.localStorage.setItem(SAVE_FALLBACK_KEY, JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
}

function loadFromLocalStorageAll(): LocalStorageEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVE_FALLBACK_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalStorageEntry[];
  } catch {
    return [];
  }
}

export function loadFromLocalStorage(storyId: string): Session | null {
  const entry = loadFromLocalStorageAll().find((item) => item.id === storyId);
  if (!entry) return null;
  try {
    return JSON.parse(entry.sessionJson) as Session;
  } catch {
    return null;
  }
}

function localEntriesToStoryMeta(entries: LocalStorageEntry[]): StoryMeta[] {
  return entries.map((entry) => ({
    id: entry.id,
    userId: null,
    worldSetting: entry.worldSetting,
    styleGuide: entry.styleGuide,
    orientation: "landscape",
    status: "active",
    sceneCount: entry.sceneCount,
    createdAt: new Date(entry.savedAt),
    updatedAt: new Date(entry.savedAt),
  }));
}

function sessionToStoryLoadResult(session: Session): StoryLoadResult {
  const createdAt = new Date(session.createdAt);
  return {
    story: {
      id: session.id,
      userId: null,
      worldSetting: session.worldSetting,
      styleGuide: session.styleGuide,
      styleReferenceImage: session.styleReferenceImage,
      orientation: (session.orientation as "portrait" | "landscape") ?? "landscape",
      storyState: session.storyState,
      status: "active",
      createdAt,
      updatedAt: createdAt,
    },
    scenes: (session.history ?? []).map((entry, idx) => ({
      id: entry.scene.id,
      sceneKey: entry.scene.sceneKey,
      sceneSummary: entry.scene.scenePrompt,
      imageUrl: entry.scene.imageUrl ?? "",
      beats: entry.scene.beats,
      orientation: entry.scene.orientation,
      sortOrder: idx,
      createdAt,
    })),
    characters: (session.characters ?? []).map((character) => ({
      name: character.name,
      voiceDescription: character.voiceDescription,
      visualDescription: character.visualDescription,
      portrait:
        character.basePortraitUrl || character.basePortraitUuid
          ? { url: character.basePortraitUrl, uuid: character.basePortraitUuid }
          : undefined,
      voice: character.voice,
    })),
  };
}

export function storyLoadResultToSession(result: StoryLoadResult): Session {
  const history = result.scenes.map((scene) => {
    const beats = scene.beats ?? [];
    const entryBeatId = beats[0]?.id ?? "";
    return {
      scene: {
        id: scene.id,
        sceneKey: scene.sceneKey,
        scenePrompt: scene.sceneSummary ?? "",
        imageUrl: scene.imageUrl,
        beats,
        entryBeatId,
        orientation: scene.orientation,
      },
      visitedBeatIds: entryBeatId ? [entryBeatId] : [],
      exit: undefined,
    };
  });

  return {
    id: result.story.id,
    createdAt: new Date(result.story.createdAt).getTime(),
    worldSetting: result.story.worldSetting,
    styleGuide: result.story.styleGuide,
    styleReferenceImage: result.story.styleReferenceImage,
    orientation: result.story.orientation,
    storyState: result.story.storyState,
    history,
    characters: result.characters.map((character) => ({
      name: character.name,
      voiceDescription: character.voiceDescription ?? "",
      visualDescription: character.visualDescription,
      basePortraitUuid: character.portrait?.uuid,
      basePortraitUrl: character.portrait?.url,
      voice: character.voice,
    })),
  };
}
