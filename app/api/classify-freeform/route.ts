import { classifyFreeform } from "@storyplay/engine";
import type { FreeformClassifyRequest } from "@storyplay/types";
import { NextResponse } from "next/server";
import { loadEngineConfig, buildByoEngineConfig } from "@/lib/config";
import { startOfficialModelUsage } from "@/lib/modelUsage";
import { loadEngineConfigForScenario, modelRouteMetadata } from "@/lib/modelRouting";
import { resolveBillingUserId } from "@/lib/serverIdentity";
import { requireUser } from "@/lib/supabase/guard";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  let body: FreeformClassifyRequest;
  try {
    body = (await req.json()) as FreeformClassifyRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.session || !body.freeformText?.trim()) {
    return NextResponse.json(
      { error: "session and freeformText are required" },
      { status: 400 },
    );
  }

  let usage: ReturnType<typeof startOfficialModelUsage> | null = null;
  const billingUserId = resolveBillingUserId(auth.userId, req);
  try {
    const routed = loadEngineConfigForScenario("classify-freeform");
    const official = body.byo ? loadEngineConfig() : routed.config;
    const config = body.byo ? buildByoEngineConfig(body.byo, official) : official;
    usage = body.byo
      ? null
      : startOfficialModelUsage({
          userId: billingUserId,
          feature: "classify-freeform",
          domains: ["text"],
          config,
          metadata: {
            sessionId: body.session.id,
            textLength: body.freeformText.length,
            ...modelRouteMetadata(routed.route),
          },
        });
    const result = await classifyFreeform(config, body);
    usage?.finish("success", { classify: result.classify });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    usage?.finish("error", { message });
    const status = message.includes("Invalid BYO") || message.includes("Missing BYO") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
