import { requestBeatAudio } from "@storyplay/engine";
import type { BeatAudioRequest } from "@storyplay/types";
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

  let body: BeatAudioRequest;
  try {
    body = (await req.json()) as BeatAudioRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Voice is now optional — when the server runs StepFun, the client omits
  // the ~220KB Xiaomi reference audio and sends stepfunVoiceId /
  // voiceDescription instead (saves Fast Origin Transfer bandwidth). The
  // engine's resolveVoice re-provisions on a provider mismatch. We only
  // require the beat text + SOMETHING to synthesize from.
  const VALID_TTS_PROVIDERS = ["xiaomi", "stepfun"];
  const hasInvalidVoiceProvider =
    !!body.voice?.provider && !VALID_TTS_PROVIDERS.includes(body.voice.provider);
  const hasVoice =
    !!body.voice?.provider && VALID_TTS_PROVIDERS.includes(body.voice.provider);
  const hasFallback =
    !!body.stepfunVoiceId || !!body.voiceDescription;
  if (
    !body.beat?.id ||
    !body.beat?.line ||
    hasInvalidVoiceProvider ||
    (!hasVoice && !hasFallback)
  ) {
    return NextResponse.json(
      { error: "beat.id and beat.line are required, plus either voice.provider (xiaomi|stepfun) or stepfunVoiceId/voiceDescription" },
      { status: 400 },
    );
  }

  const billingUserId = resolveBillingUserId(auth.userId, req);
  try {
    const { config, route: modelRoute } = loadEngineConfigForScenario("beat-audio");
    if (config.tts) {
      const quota = await checkOfficialQuota({
        userId: billingUserId,
        feature: "beat-audio",
      });
      if (!quota.allowed) return quota.response;
    }
    const usage = config.tts
      ? startOfficialModelUsage({
          userId: billingUserId,
          feature: "beat-audio",
          domains: ["tts"],
          config,
          metadata: {
            beatId: body.beat.id,
            lineLength: body.beat.line.length,
            hasVoice: hasVoice,
            hasFallback: hasFallback,
            ...modelRouteMetadata(modelRoute),
          },
        })
      : null;
    let result: Awaited<ReturnType<typeof requestBeatAudio>>;
    try {
      result = await requestBeatAudio(config, body);
      usage?.finish("success", {
        audioGenerated: Boolean(result.audio),
        mime: result.audio?.mime,
      });
    } catch (err) {
      usage?.finish("error", {
        message: err instanceof Error ? err.message : "Unknown error",
      });
      throw err;
    }
    if (!result.audio) return new Response(null, { status: 204 });
    const binary = Buffer.from(result.audio.base64, "base64");
    return new Response(binary, {
      headers: { "Content-Type": result.audio.mime },
    });
  } catch (err) {
    // Engine already swallows synth errors and returns audio:null. Anything
    // that reaches here is config-level — surface so the client can log it.
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
