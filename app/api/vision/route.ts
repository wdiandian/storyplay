import { visionDecide } from "@storyplay/engine";
import type { VisionRequest } from "@storyplay/types";
import { NextResponse } from "next/server";
import { loadEngineConfig, buildByoEngineConfig } from "@/lib/config";
import { startOfficialModelUsage } from "@/lib/modelUsage";
import { loadEngineConfigForScenario, modelRouteMetadata } from "@/lib/modelRouting";
import { checkOfficialQuota } from "@/lib/officialQuota";
import { resolveBillingUserId } from "@/lib/serverIdentity";
import { requireUser } from "@/lib/supabase/guard";

export const runtime = "nodejs";

// Browser annotator resizes to 768 wide → typically 200-800 KB base64.
// 3 MB caps abusive direct-API payloads (which would inflate upstream
// vision LLM costs) while leaving ~4x headroom for legitimate inputs.
const MAX_ANNOTATED_BYTES = 3 * 1024 * 1024;

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  let body: VisionRequest;
  try {
    body = (await req.json()) as VisionRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.session) {
    return NextResponse.json(
      { error: "session is required" },
      { status: 400 },
    );
  }
  if (
    typeof body.annotatedImageBase64 !== "string" ||
    body.annotatedImageBase64.length === 0
  ) {
    return NextResponse.json(
      { error: "annotatedImageBase64 must be a non-empty string" },
      { status: 400 },
    );
  }
  if (body.annotatedImageBase64.length > MAX_ANNOTATED_BYTES) {
    return NextResponse.json(
      { error: `annotatedImageBase64 exceeds ${MAX_ANNOTATED_BYTES} bytes` },
      { status: 413 },
    );
  }

  let usage: ReturnType<typeof startOfficialModelUsage> | null = null;
  const billingUserId = resolveBillingUserId(auth.userId, req);
  try {
    const routed = loadEngineConfigForScenario("vision");
    const official = body.byo ? loadEngineConfig() : routed.config;
    const config = body.byo ? buildByoEngineConfig(body.byo, official) : official;
    if (!body.byo) {
      const quota = await checkOfficialQuota({
        userId: billingUserId,
        feature: "vision",
      });
      if (!quota.allowed) return quota.response;
    }
    usage = body.byo
      ? null
      : startOfficialModelUsage({
          userId: billingUserId,
          feature: "vision",
          domains: ["vision"],
          config,
          metadata: {
            sessionId: body.session.id,
            imageBytes: body.annotatedImageBase64.length,
            ...modelRouteMetadata(routed.route),
          },
        });
    const result = await visionDecide(config, body);
    usage?.finish("success", { classify: result.classify });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    usage?.finish("error", { message });
    const status = message.includes("Invalid BYO") || message.includes("Missing BYO") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
