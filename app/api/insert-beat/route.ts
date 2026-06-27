import { requestInsertBeat } from "@storyplay/engine";
import type { InsertBeatRequest } from "@storyplay/types";
import { NextResponse } from "next/server";
import { startOfficialModelUsage } from "@/lib/modelUsage";
import { loadEngineConfigForScenario, modelRouteMetadata } from "@/lib/modelRouting";
import { checkOfficialQuota } from "@/lib/officialQuota";
import { resolveBillingUserId } from "@/lib/serverIdentity";
import { requireUser } from "@/lib/supabase/guard";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  let body: InsertBeatRequest;
  try {
    body = (await req.json()) as InsertBeatRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.session || !body.freeformAction) {
    return NextResponse.json(
      { error: "session and freeformAction are required" },
      { status: 400 },
    );
  }

  const billingUserId = resolveBillingUserId(auth.userId, req);
  try {
    const { config: base, route: modelRoute } = loadEngineConfigForScenario("insert-beat");
    const config = body.clientTts === true ? { ...base, tts: undefined } : base;
    const quota = await checkOfficialQuota({
      userId: billingUserId,
      feature: "insert-beat",
    });
    if (!quota.allowed) return quota.response;
    const usage = startOfficialModelUsage({
      userId: billingUserId,
      feature: "insert-beat",
      domains: ["text"],
      config,
      metadata: {
        clientTts: body.clientTts === true,
        sessionId: body.session.id,
        actionLength: body.freeformAction.length,
        ...modelRouteMetadata(modelRoute),
      },
    });
    let result: Awaited<ReturnType<typeof requestInsertBeat>>;
    try {
      result = await requestInsertBeat(config, body);
      usage.finish("success", {
        hasLine: Boolean(result.partial.line),
        characterCount: result.characters.length,
      });
    } catch (err) {
      usage.finish("error", {
        message: err instanceof Error ? err.message : "Unknown error",
      });
      throw err;
    }
    return NextResponse.json({
      ...result,
      characters: result.characters.map((c) => ({ ...c, voice: undefined })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
