import "server-only";

import { NextResponse } from "next/server";
import { getBillingCreditSpentSince } from "@/lib/billingStore";
import {
  officialCreditPrice,
  type OfficialModelFeature,
} from "@/lib/modelUsage";

const DEFAULT_DAILY_LIMIT = 50;

export type OfficialDailyQuota = {
  limit: number;
  unlimited: boolean;
};

export function officialDailyCreditLimit(): number {
  const raw = process.env.OFFICIAL_DAILY_CREDIT_LIMIT;
  if (!raw) return DEFAULT_DAILY_LIMIT;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_DAILY_LIMIT;
}

function parseQuotaValue(value: unknown): OfficialDailyQuota | null {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["unlimited", "infinite", "inf", "∞", "-1"].includes(normalized)) {
      return { limit: 0, unlimited: true };
    }
    const parsed = Number.parseInt(normalized, 10);
    if (Number.isFinite(parsed) && parsed >= 0) return { limit: parsed, unlimited: false };
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value < 0) return { limit: 0, unlimited: true };
    return { limit: Math.floor(value), unlimited: false };
  }
  return null;
}

function readUserQuotaOverrides(): Record<string, OfficialDailyQuota> {
  const raw = process.env.OFFICIAL_DAILY_CREDIT_LIMIT_BY_USER?.trim();
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed)
          .map(([userId, value]) => [userId.trim(), parseQuotaValue(value)] as const)
          .filter((entry): entry is [string, OfficialDailyQuota] => Boolean(entry[0] && entry[1])),
      );
    }
  } catch {
    /* fall through to key=value parser */
  }

  return Object.fromEntries(
    raw
      .split(",")
      .map((chunk) => {
        const [userId, value] = chunk.split("=");
        const quota = parseQuotaValue(value);
        return [userId?.trim() ?? "", quota] as const;
      })
      .filter((entry): entry is [string, OfficialDailyQuota] => Boolean(entry[0] && entry[1])),
  );
}

export function officialDailyCreditQuotaForUser(userId: string): OfficialDailyQuota {
  const override = readUserQuotaOverrides()[userId];
  if (override) return override;
  return { limit: officialDailyCreditLimit(), unlimited: false };
}

export function startOfUtcDay(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function checkOfficialQuota(input: {
  userId: string;
  feature: OfficialModelFeature;
}): Promise<{ allowed: true } | { allowed: false; response: NextResponse }> {
  const price = officialCreditPrice(input.feature);
  if (price <= 0) return { allowed: true };

  const quota = officialDailyCreditQuotaForUser(input.userId);
  if (quota.unlimited) return { allowed: true };

  const limit = quota.limit;
  if (limit <= 0) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: "今日官方模型免费额度已用完，请稍后再试或切换自带 Key。" },
        { status: 429 },
      ),
    };
  }

  try {
    const spent = await getBillingCreditSpentSince(input.userId, startOfUtcDay());
    if (spent + price <= limit) return { allowed: true };
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: "今日官方模型免费额度已用完，请稍后再试或切换自带 Key。",
          quota: { limit, spent, requested: price },
        },
        { status: 429 },
      ),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[official-quota] check skipped:", message);
    return { allowed: true };
  }
}
