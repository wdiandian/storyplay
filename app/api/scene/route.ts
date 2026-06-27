import { requestScene } from "@storyplay/engine";
import type { Character, SceneRequest, SceneStreamEvent } from "@storyplay/types";
import { NextResponse } from "next/server";
import { startOfficialModelUsage } from "@/lib/modelUsage";
import { loadEngineConfigForScenario, modelRouteMetadata } from "@/lib/modelRouting";
import { checkOfficialQuota } from "@/lib/officialQuota";
import { resolveBillingUserId } from "@/lib/serverIdentity";
import { requireUser } from "@/lib/supabase/guard";

function stripKnownVoices(
  characters: Character[],
  knownNames: Set<string>,
): Character[] {
  return characters.map((c) =>
    knownNames.has(c.name) ? { ...c, voice: undefined } : c,
  );
}

function formatSSE(event: SceneStreamEvent | { type: string; [k: string]: unknown }): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export const runtime = "nodejs";
const SSE_HEARTBEAT_MS = 15_000;

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  let body: SceneRequest;
  try {
    body = (await req.json()) as SceneRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.session) {
    return NextResponse.json({ error: "session is required" }, { status: 400 });
  }

  const acceptsSSE = req.headers.get("accept")?.includes("text/event-stream");
  const billingUserId = resolveBillingUserId(auth.userId, req);

  try {
    const { config: base, route: modelRoute } = loadEngineConfigForScenario("scene");
    const config = body.clientTts === true ? { ...base, tts: undefined } : base;
    const quota = await checkOfficialQuota({
      userId: billingUserId,
      feature: "scene",
    });
    if (!quota.allowed) return quota.response;
    const usage = startOfficialModelUsage({
      userId: billingUserId,
      feature: "scene",
      domains: config.tts ? ["text", "image", "tts"] : ["text", "image"],
      config,
      metadata: {
        streaming: acceptsSSE,
        clientTts: body.clientTts === true,
        sessionId: body.session.id,
        sceneCount: body.session.history.length,
        ...modelRouteMetadata(modelRoute),
      },
    });

    if (!acceptsSSE) {
      try {
        const result = await requestScene(config, body);
        const knownNames = new Set(
          (body.session.characters ?? []).map((c) => c.name),
        );
        usage.finish("success", {
          sceneId: result.scene.id,
          characterCount: result.characters.length,
        });
        return NextResponse.json({
          ...result,
          characters: stripKnownVoices(result.characters, knownNames),
        });
      } catch (err) {
        usage.finish("error", {
          message: err instanceof Error ? err.message : "Unknown error",
        });
        throw err;
      }
    }

    const encoder = new TextEncoder();
    const knownNames = new Set(
      (body.session.characters ?? []).map((c) => c.name),
    );

    const stream = new ReadableStream({
      async start(controller) {
        const heartbeat = setInterval(() => {
          controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
        }, SSE_HEARTBEAT_MS);
        try {
          const result = await requestScene(config, body, (event) => {
            controller.enqueue(encoder.encode(formatSSE(event)));
          });
          usage.finish("success", {
            sceneId: result.scene.id,
            characterCount: result.characters.length,
          });
          controller.enqueue(
            encoder.encode(
              formatSSE({
                type: "done",
                response: {
                  ...result,
                  characters: stripKnownVoices(result.characters, knownNames),
                },
              }),
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
