import { startSession } from "@storyplay/engine";
import type { SceneStreamEvent, StartRequest } from "@storyplay/types";
import { NextResponse } from "next/server";
import { startOfficialModelUsage } from "@/lib/modelUsage";
import { loadEngineConfigForScenario, modelRouteMetadata } from "@/lib/modelRouting";
import { checkOfficialQuota } from "@/lib/officialQuota";
import { resolveBillingUserId } from "@/lib/serverIdentity";
import { requireUser } from "@/lib/supabase/guard";

function formatSSE(event: SceneStreamEvent | { type: string; [k: string]: unknown }): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export const runtime = "nodejs";

// Matches /api/vision and /api/parse-style-image — the user's resized 512px
// webp is ~30-80 KB; this caps pathological direct-API payloads (which would
// then ride along in every subsequent /api/scene request body via session).
const MAX_STYLE_REF_BYTES = 3 * 1024 * 1024;
const SSE_HEARTBEAT_MS = 15_000;

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  let body: StartRequest;
  try {
    body = (await req.json()) as StartRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.worldSetting?.trim() || !body.styleGuide?.trim()) {
    return NextResponse.json(
      { error: "worldSetting and styleGuide are required" },
      { status: 400 },
    );
  }
  if (typeof body.styleReferenceImage === "string") {
    if (!body.styleReferenceImage.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "styleReferenceImage must be a data:image/... base64 URL" },
        { status: 400 },
      );
    }
    if (body.styleReferenceImage.length > MAX_STYLE_REF_BYTES) {
      return NextResponse.json(
        { error: `styleReferenceImage exceeds ${MAX_STYLE_REF_BYTES} bytes` },
        { status: 413 },
      );
    }
  }

  const acceptsSSE = req.headers.get("accept")?.includes("text/event-stream");
  const billingUserId = resolveBillingUserId(auth.userId, req);

  try {
    const { config: base, route: modelRoute } = loadEngineConfigForScenario("start");
    const config = body.clientTts === true ? { ...base, tts: undefined } : base;
    const quota = await checkOfficialQuota({
      userId: billingUserId,
      feature: "start",
    });
    if (!quota.allowed) return quota.response;
    const usage = startOfficialModelUsage({
      userId: billingUserId,
      feature: "start",
      domains: config.tts ? ["text", "image", "tts"] : ["text", "image"],
      config,
      metadata: {
        streaming: acceptsSSE,
        clientTts: body.clientTts === true,
        hasStyleReferenceImage: Boolean(body.styleReferenceImage),
        orientation: body.orientation ?? "landscape",
        source: body.source ?? "prompt",
        ...modelRouteMetadata(modelRoute),
      },
    });

    if (!acceptsSSE) {
      try {
        const result = await startSession(config, body);
        usage.finish("success", {
          sceneId: result.scene.id,
          characterCount: result.characters.length,
        });
        return NextResponse.json(result);
      } catch (err) {
        usage.finish("error", {
          message: err instanceof Error ? err.message : "Unknown error",
        });
        throw err;
      }
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const heartbeat = setInterval(() => {
          controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
        }, SSE_HEARTBEAT_MS);
        try {
          const result = await startSession(config, body, (event) => {
            controller.enqueue(encoder.encode(formatSSE(event)));
          });
          usage.finish("success", {
            sceneId: result.scene.id,
            characterCount: result.characters.length,
          });
          controller.enqueue(
            encoder.encode(
              formatSSE({ type: "done", response: result }),
            ),
          );
          controller.close();
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          usage.finish("error", { message });
          controller.enqueue(
            encoder.encode(formatSSE({ type: "error", message })),
          );
          controller.close();
        } finally {
          clearInterval(heartbeat);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
