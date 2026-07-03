import { generateImage } from "@storyplay/ai-client";
import { coerceOrientation, type ByoLlmKeys, type EngineConfig, type Orientation } from "@storyplay/types";
import { NextResponse } from "next/server";
import { buildByoEngineConfig } from "@/lib/config";
import {
  startOfficialModelUsage,
  type OfficialModelUsageTracker,
} from "@/lib/modelUsage";
import { loadEngineConfigForScenario, modelRouteMetadata } from "@/lib/modelRouting";
import { checkOfficialQuota } from "@/lib/officialQuota";
import {
  buildStudioAssetKey,
  storeStudioAssetFromDataUrl,
  storeStudioAssetFromUrl,
} from "@/lib/storyProject/assetStorage";
import { requireOwnedStoryProject } from "@/lib/storyProject/auth";
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
  if (kind === "cover") return "portrait cover key art";
  if (kind === "first-scene") return "16:9 opening scene background";
  if (kind === "character-reference") return "16:9 double-column character design sheet";
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
      "生成一张比例为 16:9 的宽屏人物设定卡，专业美术设定集质感，高级极简双栏排版，干净的深色或中性色背景。",
      "画面只包含人物参考图，不添加多余文字、图标、标签、装饰、UI、Logo、水印或复杂场景。",
      characterName ? `Character name: ${characterName}.` : "",
      characterVisualNotes ? `Character visual notes: ${characterVisualNotes}.` : "",
      "【左侧区域】：占画面约 40%，展示同一人物的超清面部特写，只包含头部与少量肩颈。五官、皮肤质感、发丝、眉眼、妆容、疤痕或特殊标记必须清晰可见。电影级人像摄影，伦勃朗光，柔和补光，轻微边缘光。",
      "【右侧区域】：占画面约 60%，并排展示同一人物的三视图全身站姿：正面、侧面、背面。三张全身像必须保持同一人物、同一服装、同一比例、同一身高和同一光照条件。",
      "人物自然直立，双脚平稳站立，姿态中性，服装结构、材质、鞋履和背面细节完整可见，适合作为角色建模和绘画参考。",
      "画面风格：8k 分辨率，照片级写实，电影级质感，面部特写极清晰，右侧三视图为均匀棚拍光，整体排版干净克制。",
    );
  } else if (kind === "cover") {
    base.push(
      "Portrait cover key art for a story card, strong hook, cinematic composition.",
      "No text, no title lettering, no captions, no UI, no logo, no watermark, no split panels, no collage, no comic layout.",
      "Leave clean negative space for app overlay, but do not draw typography or graphic-design blocks.",
    );
  } else if (kind === "first-scene") {
    base.push(
      "Create a single uninterrupted 16:9 landscape scene background / establishing shot for the first playable scene.",
      "It must be one coherent environment, not cover art, not a poster, not a character sheet, not a split panel, not a collage, not a comic page.",
      "No text, no title, no captions, no typography, no UI, no speech bubbles, no logo, no watermark.",
      "Keep the lower area visually clean enough for dialogue and choice UI overlays. Frame important characters or objects in the upper 65%.",
      "Prioritize story atmosphere, readable space, lighting, camera angle, and the first suspense object or emotional focal point.",
    );
  } else {
    base.push(
      "Cinematic interactive visual novel background, no text, no title, no UI, no speech bubbles, no panels, no collage. Frame important characters or objects in the upper 65%.",
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

function resolveAssetOrientation(
  kind: StoryProjectAssetKind,
  body: GenerateAssetBody,
  projectOrientation: Orientation,
): Orientation {
  if (kind === "first-scene") return "landscape";
  if (kind === "character-reference") return "landscape";
  if (kind === "cover") return "portrait";
  return coerceOrientation(body.orientation ?? projectOrientation);
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
  const owned = await requireOwnedStoryProject(id);
  if (owned instanceof NextResponse) return owned;
  const project = owned.project;

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
  const billingUserId = owned.userId;
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
    const orientation = resolveAssetOrientation(kind, body, project.runtimePolicy.orientation);
    const result = await generateImage(imageConfig, fullPrompt, {
      orientation,
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
      orientation,
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
        orientation,
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
