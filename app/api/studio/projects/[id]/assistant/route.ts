import { NextResponse } from "next/server";
import { diagnoseStoryProjectLocally } from "@/lib/creatorAssistant/localDiagnose";
import { runCreatorStoryAssistant } from "@/lib/creatorAssistant/runCreatorStoryAssistant";
import {
  startOfficialModelUsage,
  type OfficialModelUsageTracker,
} from "@/lib/modelUsage";
import { loadEngineConfigForScenario, modelRouteMetadata } from "@/lib/modelRouting";
import { checkOfficialQuota } from "@/lib/officialQuota";
import { resolveBillingUserId } from "@/lib/serverIdentity";
import type {
  CreatorStoryAssistantAction,
  CreatorStoryAssistantConversationMessage,
  CreatorStoryAssistantTargetSection,
} from "@/lib/creatorAssistant/types";
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
const targetSections = new Set<CreatorStoryAssistantTargetSection>([
  "project",
  "basics",
  "world",
  "narrative",
  "outline",
  "characters",
  "assets",
  "interaction",
  "visual",
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

function readConversation(value: unknown): CreatorStoryAssistantConversationMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): CreatorStoryAssistantConversationMessage | undefined => {
      if (!item || typeof item !== "object") return undefined;
      const candidate = item as Record<string, unknown>;
      const role = candidate.role === "assistant" ? "assistant" : candidate.role === "creator" ? "creator" : undefined;
      const content = readOptionalString(candidate.content);
      if (!role || !content) return undefined;
      return { role, content: content.slice(0, 800) };
    })
    .filter((item): item is CreatorStoryAssistantConversationMessage => Boolean(item))
    .slice(-8);
}

function readTargetSection(value: unknown): CreatorStoryAssistantTargetSection | undefined {
  return typeof value === "string" && targetSections.has(value as CreatorStoryAssistantTargetSection)
    ? (value as CreatorStoryAssistantTargetSection)
    : undefined;
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

  let routedConfig: ReturnType<typeof loadEngineConfigForScenario>;
  try {
    routedConfig = loadEngineConfigForScenario("studio-assistant");
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

  const billingUserId = resolveBillingUserId("anonymous", req);
  const quota = await checkOfficialQuota({
    userId: billingUserId,
    feature: "studio-assistant",
  });
  if (!quota.allowed) return quota.response;

  const usage: OfficialModelUsageTracker = startOfficialModelUsage({
    userId: billingUserId,
    feature: "studio-assistant",
    domains: ["text"],
    config: routedConfig.config,
    metadata: {
      action,
      projectId: id,
      locale: readLocale(body.locale, inputProject.language),
      ...modelRouteMetadata(routedConfig.route),
    },
  });

  try {
    const result = await runCreatorStoryAssistant(routedConfig.config.text, {
      action,
      project: inputProject,
      userInstruction: readOptionalString(body.userInstruction),
      conversation: readConversation(body.conversation),
      targetSection: readTargetSection(body.targetSection),
      selectedActId: readOptionalString(body.selectedActId),
      selectedSceneId: readOptionalString(body.selectedSceneId),
      playtestId: readOptionalString(body.playtestId),
      locale: readLocale(body.locale, inputProject.language),
    });
    usage.finish("success", {
      suggestionCount: result.suggestions.length,
      hasPatch: Boolean(result.patch),
    });

    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Creator assistant failed";
    usage.finish("error", { message });
    return jsonError(message, 500);
  }
}
