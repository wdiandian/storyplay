import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { KVNamespace } from "@cloudflare/workers-types";
import {
  normalizeStoryProject,
  type StoryProject,
} from "@/lib/storyProject/types";

const projectStorePath = path.join(process.cwd(), ".storyplay", "studio", "projects.json");
const projectKvKey = "studio:story-projects:v1";

export type StoryProjectStoreProvider = "file" | "kv";

export type StoryProjectStore = {
  provider: StoryProjectStoreProvider;
  listProjects: () => Promise<StoryProject[]>;
  getProject: (id: string) => Promise<StoryProject | null>;
  saveProject: (project: StoryProject) => Promise<StoryProject>;
  deleteProject: (id: string) => Promise<boolean>;
};

type StoredProjectFile = {
  version: 1;
  updatedAt: string;
  projects: Record<string, StoryProject>;
};

async function readProjectFile(): Promise<StoredProjectFile> {
  try {
    const raw = await readFile(projectStorePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoredProjectFile>;
    return {
      version: 1,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
      projects:
        typeof parsed.projects === "object" && parsed.projects !== null && !Array.isArray(parsed.projects)
          ? (parsed.projects as Record<string, StoryProject>)
          : {},
    };
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return { version: 1, updatedAt: new Date(0).toISOString(), projects: {} };
    }

    throw error;
  }
}

async function writeProjectFile(projects: Record<string, StoryProject>) {
  await mkdir(path.dirname(projectStorePath), { recursive: true });
  await writeFile(
    projectStorePath,
    JSON.stringify(
      {
        version: 1,
        updatedAt: new Date().toISOString(),
        projects,
      } satisfies StoredProjectFile,
      null,
      2,
    ),
    "utf8",
  );
}

export async function listStoredStoryProjects(): Promise<StoryProject[]> {
  return getStoryProjectStore().listProjects();
}

export async function getStoredStoryProject(id: string): Promise<StoryProject | null> {
  return getStoryProjectStore().getProject(id);
}

export async function saveStoredStoryProject(project: StoryProject): Promise<StoryProject> {
  return getStoryProjectStore().saveProject(project);
}

export async function deleteStoredStoryProject(id: string): Promise<boolean> {
  return getStoryProjectStore().deleteProject(id);
}

class FileStoryProjectStore implements StoryProjectStore {
  provider: StoryProjectStoreProvider = "file";

  async listProjects(): Promise<StoryProject[]> {
    const file = await readProjectFile();
    return Object.values(file.projects)
      .map((project) => normalizeStoryProject(project))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getProject(id: string): Promise<StoryProject | null> {
    const file = await readProjectFile();
    const project = file.projects[id];
    return project ? normalizeStoryProject(project) : null;
  }

  async saveProject(project: StoryProject): Promise<StoryProject> {
    const normalizedProject = normalizeStoryProject(project, { touchUpdatedAt: true });
    const file = await readProjectFile();
    await writeProjectFile({
      ...file.projects,
      [normalizedProject.id]: normalizedProject,
    });
    return normalizedProject;
  }

  async deleteProject(id: string): Promise<boolean> {
    const file = await readProjectFile();
    if (!file.projects[id]) return false;

    const { [id]: _deleted, ...projects } = file.projects;
    await writeProjectFile(projects);
    return true;
  }
}

const fileStoryProjectStore = new FileStoryProjectStore();

class KvStoryProjectStore implements StoryProjectStore {
  provider: StoryProjectStoreProvider = "kv";

  constructor(private readonly kv: KVNamespace) {}

  private async readFile(): Promise<StoredProjectFile> {
    const parsed = await this.kv.get<Partial<StoredProjectFile>>(projectKvKey, "json");
    return {
      version: 1,
      updatedAt: typeof parsed?.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
      projects:
        typeof parsed?.projects === "object" && parsed.projects !== null && !Array.isArray(parsed.projects)
          ? (parsed.projects as Record<string, StoryProject>)
          : {},
    };
  }

  private async writeFile(projects: Record<string, StoryProject>) {
    await this.kv.put(
      projectKvKey,
      JSON.stringify({
        version: 1,
        updatedAt: new Date().toISOString(),
        projects,
      } satisfies StoredProjectFile),
    );
  }

  async listProjects(): Promise<StoryProject[]> {
    const file = await this.readFile();
    return Object.values(file.projects)
      .map((project) => normalizeStoryProject(project))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getProject(id: string): Promise<StoryProject | null> {
    const file = await this.readFile();
    const project = file.projects[id];
    return project ? normalizeStoryProject(project) : null;
  }

  async saveProject(project: StoryProject): Promise<StoryProject> {
    const normalizedProject = normalizeStoryProject(project, { touchUpdatedAt: true });
    const file = await this.readFile();
    await this.writeFile({
      ...file.projects,
      [normalizedProject.id]: normalizedProject,
    });
    return normalizedProject;
  }

  async deleteProject(id: string): Promise<boolean> {
    const file = await this.readFile();
    if (!file.projects[id]) return false;

    const { [id]: _deleted, ...projects } = file.projects;
    await this.writeFile(projects);
    return true;
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

export function getStoryProjectStore(): StoryProjectStore {
  const kv = getBoundKv();
  if (kv) return new KvStoryProjectStore(kv);
  return fileStoryProjectStore;
}
