import "server-only";

import { NextResponse } from "next/server";
import { getBillingCreditSpentSince } from "@/lib/billingStore";
import {
  officialCreditPrice,
  type OfficialModelFeature,
} from "@/lib/modelUsage";

const DEFAULT_DAILY_LIMIT = 50;

export function officialDailyCreditLimit(): number {
  const raw = process.env.OFFICIAL_DAILY_CREDIT_LIMIT;
  if (!raw) return DEFAULT_DAILY_LIMIT;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_DAILY_LIMIT;
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

  const limit = officialDailyCreditLimit();
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
