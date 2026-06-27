import { NextResponse } from "next/server";
import { loadEngineConfig } from "@/lib/config";
import { diagnoseStoryProjectLocally } from "@/lib/creatorAssistant/localDiagnose";
import { runCreatorStoryAssistant } from "@/lib/creatorAssistant/runCreatorStoryAssistant";
import type { CreatorStoryAssistantAction } from "@/lib/creatorAssistant/types";
import { getStoredStoryProject } from "@/lib/storyProject/store";
import {
  normalizeStoryProject,
  type StoryProject,
  type StoryProjectLanguage,
} from "@/lib/storyProject/types";

export const runtime = "nodejs";

type ProjectAssistantRouteContext = {
  params: Promise<{ id: string }>;
};

const actions = new Set<CreatorStoryAssistantAction>([
  "diagnose",
  "expand-concept",
  "build-outline",
  "create-characters",
  "improve-playtest",
]);

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function readAction(value: unknown): CreatorStoryAssistantAction | undefined {
  return typeof value === "string" && actions.has(value as CreatorStoryAssistantAction)
    ? (value as CreatorStoryAssistantAction)
    : undefined;
}

function readOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

function readLocale(value: unknown, fallback: StoryProjectLanguage): StoryProjectLanguage {
  return value === "zh-CN" || value === "en" || value === "ja" ? value : fallback;
}

export async function POST(req: Request, context: ProjectAssistantRouteContext) {
  const { id } = await context.params;
  const project = await getStoredStoryProject(id);
  if (!project) return jsonError("Unknown project id", 404);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid JSON payload");
  }

  const action = readAction(body.action);
  if (!action) return jsonError("Invalid assistant action");
  const inputProject =
    body.project && typeof body.project === "object"
      ? normalizeStoryProject({
          ...project,
          ...(body.project as StoryProject),
          id,
          createdAt: project.createdAt,
        } as StoryProject)
      : project;

  let config: ReturnType<typeof loadEngineConfig>;
  try {
    config = loadEngineConfig();
  } catch (err) {
    const message = err instanceof Error ? err.message : "模型配置不可用";
    const result = diagnoseStoryProjectLocally(inputProject);
    return NextResponse.json({
      result: {
        ...result,
        suggestions: [
          {
            severity: "warning",
            field: "assistant",
            message: `模型配置不可用，已使用本地诊断。${message}`,
          },
          ...result.suggestions,
        ].slice(0, 10),
      },
    });
  }

  try {
    const result = await runCreatorStoryAssistant(config.text, {
      action,
      project: inputProject,
      userInstruction: readOptionalString(body.userInstruction),
      selectedActId: readOptionalString(body.selectedActId),
      selectedSceneId: readOptionalString(body.selectedSceneId),
      playtestId: readOptionalString(body.playtestId),
      locale: readLocale(body.locale, inputProject.language),
    });

    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Creator assistant failed";
    return jsonError(message, 500);
  }
}
