import "server-only";

import type { EngineConfig, ProviderConfig } from "@storyplay/types";
import {
  createBillingLedgerEntry,
  createBillingUsageRecord,
} from "@/lib/billingStore";

export type OfficialModelDomain = "text" | "image" | "vision" | "tts";

export type OfficialModelFeature =
  | "start"
  | "scene"
  | "vision"
  | "classify-freeform"
  | "insert-beat"
  | "parse-style-image"
  | "beat-audio"
  | "studio-assistant"
  | "studio-asset-image";

type UsageStatus = "success" | "error";

type ProviderUsageSnapshot = {
  provider?: string;
  model: string;
  baseUrlHost?: string;
};

export type OfficialModelUsageTracker = {
  finish: (
    status: UsageStatus,
    result?: Record<string, unknown>,
  ) => void;
};

const noopTracker: OfficialModelUsageTracker = {
  finish: () => undefined,
};

export const OFFICIAL_CREDIT_PRICE: Record<OfficialModelFeature, number> = {
  start: 10,
  scene: 10,
  vision: 1,
  "classify-freeform": 0,
  "insert-beat": 2,
  "parse-style-image": 1,
  "beat-audio": 1,
  "studio-assistant": 5,
  "studio-asset-image": 8,
};

export function officialCreditPrice(
  feature: OfficialModelFeature,
  status: UsageStatus = "success",
): number {
  if (status !== "success") return 0;
  return OFFICIAL_CREDIT_PRICE[feature] ?? 0;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return "{}";
  }
}

function makeId(prefix: string): string {
  const raw =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${raw}`;
}

async function persistOfficialUsage(event: {
  id: string;
  userId: string;
  accessMode: "official";
  feature: OfficialModelFeature;
  domains: OfficialModelDomain[];
  models: Partial<Record<OfficialModelDomain, ProviderUsageSnapshot>>;
  status: UsageStatus;
  durationMs: number;
  metadata: Record<string, unknown>;
  result: Record<string, unknown>;
  creditsCharged: number;
  createdAt: Date;
}): Promise<void> {
  await createBillingUsageRecord({
    id: event.id,
    userId: event.userId,
    accessMode: event.accessMode,
    feature: event.feature,
    domainsJson: safeStringify(event.domains),
    modelsJson: safeStringify(event.models),
    status: event.status,
    durationMs: event.durationMs,
    metadataJson: safeStringify(event.metadata),
    resultJson: safeStringify(event.result),
    creditsCharged: event.creditsCharged,
    createdAt: event.createdAt,
  });

  if (event.creditsCharged > 0) {
    await createBillingLedgerEntry({
      id: makeId("ledger"),
      userId: event.userId,
      usageRecordId: event.id,
      kind: "charge",
      amount: -event.creditsCharged,
      feature: event.feature,
      reason: `Official model usage: ${event.feature}`,
      createdAt: event.createdAt,
    });
  }
}

function providerSnapshot(config: ProviderConfig): ProviderUsageSnapshot {
  let baseUrlHost: string | undefined;
  try {
    baseUrlHost = new URL(config.baseUrl).host;
  } catch {
    baseUrlHost = undefined;
  }
  return {
    provider: config.provider,
    model: config.model,
    baseUrlHost,
  };
}

function modelSnapshots(
  config: EngineConfig,
  domains: OfficialModelDomain[],
): Partial<Record<OfficialModelDomain, ProviderUsageSnapshot>> {
  const models: Partial<Record<OfficialModelDomain, ProviderUsageSnapshot>> = {};
  for (const domain of domains) {
    if (domain === "text") models.text = providerSnapshot(config.text);
    if (domain === "image") models.image = providerSnapshot(config.image);
    if (domain === "vision") models.vision = providerSnapshot(config.vision);
    if (domain === "tts" && config.tts) {
      models.tts = {
        model: config.tts.speechModel,
        baseUrlHost: (() => {
          try {
            return new URL(config.tts!.baseUrl).host;
          } catch {
            return undefined;
          }
        })(),
      };
    }
  }
  return models;
}

export function startOfficialModelUsage(input: {
  userId: string;
  feature: OfficialModelFeature;
  domains: OfficialModelDomain[];
  config: EngineConfig;
  metadata?: Record<string, unknown>;
}): OfficialModelUsageTracker {
  const domains = [...new Set(input.domains)];
  if (domains.length === 0) return noopTracker;

  const id = makeId("usage");
  const startedAt = Date.now();
  let finished = false;

  return {
    finish(status, result) {
      if (finished) return;
      finished = true;
      const creditsCharged = officialCreditPrice(input.feature, status);
      const createdAt = new Date();
      const event = {
        type: "official_model_usage",
        id,
        accessMode: "official",
        userId: input.userId,
        feature: input.feature,
        domains,
        models: modelSnapshots(input.config, domains),
        status,
        durationMs: Date.now() - startedAt,
        metadata: input.metadata ?? {},
        result: result ?? {},
        creditsCharged,
        createdAt: createdAt.toISOString(),
      };
      console.info("[model-usage]", JSON.stringify(event));
      void persistOfficialUsage({
        id,
        userId: input.userId,
        accessMode: "official",
        feature: input.feature,
        domains,
        models: event.models,
        status,
        durationMs: event.durationMs,
        metadata: input.metadata ?? {},
        result: result ?? {},
        creditsCharged,
        createdAt,
      }).catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        console.warn("[model-usage] persist skipped:", message);
      });
    },
  };
}
