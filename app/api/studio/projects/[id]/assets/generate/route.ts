import { generateImage } from "@storyplay/ai-client";
import type { ByoLlmKeys, EngineConfig, Orientation } from "@storyplay/types";
import { NextResponse } from "next/server";
import { buildByoEngineConfig } from "@/lib/config";
import {
  startOfficialModelUsage,
  type OfficialModelUsageTracker,
} from "@/lib/modelUsage";
import { loadEngineConfigForScenario, modelRouteMetadata } from "@/lib/modelRouting";
import { checkOfficialQuota } from "@/lib/officialQuota";
import { resolveBillingUserId } from "@/lib/serverIdentity";
import {
  buildStudioAssetKey,
  storeStudioAssetFromDataUrl,
  storeStudioAssetFromUrl,
} from "@/lib/storyProject/assetStorage";
import { getStoredStoryProject } from "@/lib/storyProject/store";
import type { StoryProjectAssetKind } from "@/lib/storyProject/types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type GenerateAssetBody = {
  kind?: StoryProjectAssetKind;
  prompt?: string;
  title?: string;
  characterName?: string;
  characterVisualNotes?: string;
  stylePrompt?: string;
  orientation?: Orientation;
  referenceImages?: string[];
  byo?: ByoLlmKeys;
};

const allowedKinds = new Set<StoryProjectAssetKind>([
  "cover",
  "first-scene",
  "character-reference",
  "style-reference",
  "runtime-scene",
]);

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function readKind(value: unknown): StoryProjectAssetKind | undefined {
  return typeof value === "string" && allowedKinds.has(value as StoryProjectAssetKind)
    ? (value as StoryProjectAssetKind)
    : undefined;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readReferenceImages(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function assetKindLabel(kind: StoryProjectAssetKind) {
  if (kind === "cover") return "cover key art";
  if (kind === "first-scene") return "first playable scene background";
  if (kind === "character-reference") return "single character reference sheet";
  if (kind === "style-reference") return "style reference";
  return "runtime scene image";
}

function buildPrompt(projectTitle: string, body: GenerateAssetBody, kind: StoryProjectAssetKind) {
  const prompt = readString(body.prompt);
  const stylePrompt = readString(body.stylePrompt);
  const characterName = readString(body.characterName);
  const characterVisualNotes = readString(body.characterVisualNotes);
  const title = readString(body.title) || projectTitle;
  const base = [
    `Create ${assetKindLabel(kind)} for StoryPlay interactive story "${title}".`,
    stylePrompt ? `Visual style: ${stylePrompt}.` : "",
    prompt ? `Creative brief: ${prompt}` : "",
  ];

  if (kind === "character-reference") {
    base.push(
      "The image must show exactly one character, clean reference-sheet composition, no text, no UI, no logo.",
      characterName ? `Character name: ${characterName}.` : "",
      characterVisualNotes ? `Character visual notes: ${characterVisualNotes}.` : "",
      "Neutral or lightly expressive pose, clear face, outfit, hairstyle, and silhouette. Plain or subtle background.",
    );
  } else if (kind === "cover") {
    base.push(
      "Cinematic vertical key art, strong hook, no text, no title lettering, no UI. Leave clean negative space for app overlay.",
    );
  } else {
    base.push(
      "Cinematic interactive visual novel background, no text, no UI, no speech bubbles. Frame important characters or objects in the upper 65%.",
    );
  }

  return base.filter(Boolean).join("\n");
}

function resolveConfig(base: EngineConfig, body: GenerateAssetBody) {
  if (body.byo?.image) return buildByoEngineConfig(body.byo, base);
  return base;
}

function resolveAssetImageConfig(config: EngineConfig, kind: StoryProjectAssetKind) {
  if (kind === "character-reference") {
    return config.imageProfiles?.character ?? config.image;
  }
  return config.imageProfiles?.scene ?? config.image;
}

async function persistGeneratedAsset(input: {
  projectId: string;
  kind: StoryProjectAssetKind;
  title: string;
  imageUrl: string;
}) {
  const contentType = input.imageUrl.startsWith("data:image/")
    ? input.imageUrl.slice(5, input.imageUrl.indexOf(";"))
    : "image/webp";
  const key = buildStudioAssetKey({
    projectId: input.projectId,
    kind: input.kind,
    name: input.title || input.kind,
    contentType,
  });
  if (input.imageUrl.startsWith("data:image/")) {
    return storeStudioAssetFromDataUrl({ dataUrl: input.imageUrl, key });
  }
  return storeStudioAssetFromUrl({ url: input.imageUrl, key });
}

export async function POST(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const project = await getStoredStoryProject(id);
  if (!project) return jsonError("Unknown project id", 404);

  let body: GenerateAssetBody;
  try {
    body = (await req.json()) as GenerateAssetBody;
  } catch {
    return jsonError("Invalid JSON payload");
  }

  const kind = readKind(body.kind);
  if (!kind) return jsonError("Invalid asset kind");
  const prompt = readString(body.prompt);
  if (!prompt && kind !== "character-reference") {
    return jsonError("prompt is required");
  }
  if (kind === "character-reference" && !prompt && !readString(body.characterVisualNotes)) {
    return jsonError("prompt or characterVisualNotes is required");
  }

  let routed: ReturnType<typeof loadEngineConfigForScenario>;
  try {
    routed = loadEngineConfigForScenario("studio-asset-image");
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Image model config unavailable", 500);
  }

  const usingByo = Boolean(body.byo?.image);
  const billingUserId = resolveBillingUserId("anonymous", req);
  let usage: OfficialModelUsageTracker | undefined;

  if (!usingByo) {
    const quota = await checkOfficialQuota({
      userId: billingUserId,
      feature: "studio-asset-image",
    });
    if (!quota.allowed) return quota.response;
    usage = startOfficialModelUsage({
      userId: billingUserId,
      feature: "studio-asset-image",
      domains: ["image"],
      config: routed.config,
      metadata: {
        projectId: id,
        kind,
        ...modelRouteMetadata(routed.route),
      },
    });
  }

  try {
    const config = resolveConfig(routed.config, body);
    const imageConfig = resolveAssetImageConfig(config, kind);
    const fullPrompt = buildPrompt(project.title, body, kind);
    const result = await generateImage(imageConfig, fullPrompt, {
      orientation: body.orientation ?? project.runtimePolicy.orientation,
      referenceImages: readReferenceImages(body.referenceImages),
      timeoutMs: config.imageTimeoutMs,
    });
    let persistentUrl = result.imageUrl;
    let storageKey = "";
    let storageError = "";
    try {
      const stored = await persistGeneratedAsset({
        projectId: id,
        kind,
        title: readString(body.title) || project.title,
        imageUrl: result.imageUrl,
      });
      persistentUrl = stored.url;
      storageKey = stored.key;
    } catch (err) {
      storageError = err instanceof Error ? err.message : "Asset persistence failed";
      console.warn("[studio-asset-image] persistence skipped:", storageError);
    }

    usage?.finish("success", {
      kind,
      imageUrl: persistentUrl,
      imageUuid: result.imageUuid,
      storageKey,
      storageError,
      usingByo,
    });

    return NextResponse.json({
      asset: {
        kind,
        imageUrl: persistentUrl,
        imageUuid: result.imageUuid,
        key: storageKey,
        storageError,
        prompt: fullPrompt,
        source: "generated",
        status: "ready",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image generation failed";
    usage?.finish("error", { kind, message, usingByo });
    return jsonError(message, 500);
  }
}
