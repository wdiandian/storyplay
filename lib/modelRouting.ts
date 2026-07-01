import "server-only";

import type {
  EngineConfig,
  ProviderConfig,
  ProviderProtocol,
  TtsConfig,
} from "@storyplay/types";
import { loadEngineConfig } from "@/lib/config";
import type { OfficialModelDomain, OfficialModelFeature } from "@/lib/modelUsage";

export type ModelScenario = OfficialModelFeature;

export type ProviderModelProfileId =
  | "text-main"
  | "text-fast"
  | "text-lite"
  | "vision-main"
  | "vision-fast"
  | "image-scene"
  | "image-character";

export type TtsModelProfileId = "tts-main";

export type ModelProfileId = ProviderModelProfileId | TtsModelProfileId;

export type ModelRouteProfiles = Partial<Record<OfficialModelDomain, ModelProfileId>>;

export type ModelRoute = {
  scenario: ModelScenario;
  profiles: ModelRouteProfiles;
};

export type TextAgentProfileName = "main" | "fast" | "lite";

export type TextAgentProfileRoute = Partial<Record<
  | "writer"
  | "character-designer"
  | "cinematographer"
  | "style-selector"
  | "freeform-classifier"
  | "insert-beat"
  | "creator-story-assistant",
  TextAgentProfileName
>>;

export type RoutedEngineConfig = {
  config: EngineConfig;
  route: ModelRoute;
};

const VALID_PROTOCOLS = [
  "openai_compatible",
  "openai",
  "runware",
] as const;

const DEFAULT_ROUTE_PROFILES: Record<ModelScenario, ModelRouteProfiles> = {
  start: {
    text: "text-main",
    image: "image-scene",
    tts: "tts-main",
  },
  scene: {
    text: "text-main",
    image: "image-scene",
    tts: "tts-main",
  },
  vision: {
    vision: "vision-fast",
  },
  "classify-freeform": {
    text: "text-lite",
  },
  "insert-beat": {
    text: "text-fast",
  },
  "parse-style-image": {
    vision: "vision-main",
  },
  "beat-audio": {
    tts: "tts-main",
  },
  "studio-assistant": {
    text: "text-main",
  },
  "studio-asset-image": {
    image: "image-character",
  },
};

function readOptionalVar(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

function readProfileProvider(name: string): ProviderProtocol | undefined {
  const v = readOptionalVar(name)?.trim().toLowerCase();
  if (!v) return undefined;
  if ((VALID_PROTOCOLS as readonly string[]).includes(v)) {
    return v as ProviderProtocol;
  }
  const hint =
    v === "anthropic" || v === "google"
      ? " — use openai_compatible with their OpenAI-compatible endpoint instead"
      : "";
  throw new Error(
    `Invalid ${name}: "${v}". Must be one of: ${VALID_PROTOCOLS.join(", ")}${hint}`,
  );
}

function prefixForProfile(profile: ModelProfileId): string {
  return `MODEL_PROFILE_${profile.toUpperCase().replace(/-/g, "_")}`;
}

function applyProviderProfile(
  fallback: ProviderConfig,
  profile: ProviderModelProfileId,
): ProviderConfig {
  const prefix = prefixForProfile(profile);
  return {
    baseUrl: readOptionalVar(`${prefix}_BASE_URL`) ?? fallback.baseUrl,
    apiKey: readOptionalVar(`${prefix}_API_KEY`) ?? fallback.apiKey,
    model: readOptionalVar(`${prefix}_MODEL`) ?? fallback.model,
    provider: readProfileProvider(`${prefix}_PROVIDER`) ?? fallback.provider,
  };
}

function applyTtsProfile(
  fallback: TtsConfig | undefined,
  profile: TtsModelProfileId,
): TtsConfig | undefined {
  const prefix = prefixForProfile(profile);
  const baseUrl = readOptionalVar(`${prefix}_BASE_URL`) ?? fallback?.baseUrl;
  const apiKey = readOptionalVar(`${prefix}_API_KEY`) ?? fallback?.apiKey;
  const speechModel =
    readOptionalVar(`${prefix}_SPEECH_MODEL`) ?? fallback?.speechModel;

  if (!baseUrl || !apiKey || !speechModel) return fallback;
  return { baseUrl, apiKey, speechModel };
}

function providerProfileFor(
  profiles: ModelRouteProfiles,
  domain: "text" | "image" | "vision",
): ProviderModelProfileId | undefined {
  const profile = profiles[domain];
  if (
    profile === "text-main" ||
    profile === "text-fast" ||
    profile === "text-lite" ||
    profile === "vision-main" ||
    profile === "vision-fast" ||
    profile === "image-scene" ||
    profile === "image-character"
  ) {
    return profile;
  }
  return undefined;
}

function ttsProfileFor(profiles: ModelRouteProfiles): TtsModelProfileId | undefined {
  return profiles.tts === "tts-main" ? "tts-main" : undefined;
}

function resolveTextConfig(
  base: EngineConfig,
  profile: ProviderModelProfileId,
): ProviderConfig {
  if (profile === "text-main") {
    return applyProviderProfile(base.text, "text-main");
  }
  if (profile === "text-fast") {
    return applyProviderProfile(resolveTextConfig(base, "text-main"), "text-fast");
  }
  if (profile === "text-lite") {
    return applyProviderProfile(resolveTextConfig(base, "text-fast"), "text-lite");
  }
  return base.text;
}

function resolveVisionConfig(
  base: EngineConfig,
  profile: ProviderModelProfileId,
): ProviderConfig {
  if (profile === "vision-main") {
    return applyProviderProfile(base.vision, "vision-main");
  }
  if (profile === "vision-fast") {
    return applyProviderProfile(resolveVisionConfig(base, "vision-main"), "vision-fast");
  }
  return base.vision;
}

function resolveImageConfig(
  base: EngineConfig,
  profile: ProviderModelProfileId,
): ProviderConfig {
  if (profile === "image-scene") {
    return applyProviderProfile(base.image, "image-scene");
  }
  if (profile === "image-character") {
    return applyProviderProfile(resolveImageConfig(base, "image-scene"), "image-character");
  }
  return base.image;
}

function resolveScenarioProfiles(scenario: ModelScenario): ModelRouteProfiles {
  return DEFAULT_ROUTE_PROFILES[scenario] ?? {};
}

export function loadEngineConfigForScenario(
  scenario: ModelScenario,
): RoutedEngineConfig {
  const base = loadEngineConfig();
  const profiles = resolveScenarioProfiles(scenario);
  const textProfile = providerProfileFor(profiles, "text");
  const imageProfile = providerProfileFor(profiles, "image");
  const visionProfile = providerProfileFor(profiles, "vision");
  const ttsProfile = ttsProfileFor(profiles);

  return {
    config: {
      ...base,
      text: textProfile ? resolveTextConfig(base, textProfile) : base.text,
      textProfiles: {
        main: resolveTextConfig(base, "text-main"),
        fast: resolveTextConfig(base, "text-fast"),
        lite: resolveTextConfig(base, "text-lite"),
      },
      image: imageProfile ? resolveImageConfig(base, imageProfile) : base.image,
      vision: visionProfile ? resolveVisionConfig(base, visionProfile) : base.vision,
      tts: ttsProfile ? applyTtsProfile(base.tts, ttsProfile) : base.tts,
    },
    route: {
      scenario,
      profiles,
    },
  };
}

export function modelRouteMetadata(route: ModelRoute): Record<string, unknown> {
  return {
    modelRoute: route,
    textAgentProfiles: textAgentProfilesForScenario(route.scenario),
  };
}

function textAgentProfilesForScenario(
  scenario: ModelScenario,
): TextAgentProfileRoute {
  if (scenario === "start") {
    return {
      writer: "main",
      "character-designer": "fast",
      cinematographer: "fast",
      "style-selector": "lite",
    };
  }
  if (scenario === "scene") {
    return {
      writer: "main",
      "character-designer": "fast",
      cinematographer: "fast",
    };
  }
  if (scenario === "classify-freeform") {
    return { "freeform-classifier": "lite" };
  }
  if (scenario === "insert-beat") {
    return { "insert-beat": "fast" };
  }
  if (scenario === "studio-assistant") {
    return { "creator-story-assistant": "main" };
  }
  return {};
}
