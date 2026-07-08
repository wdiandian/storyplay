import { NextResponse } from "next/server";
import { getBillingSummaryForUser } from "@/lib/billingStore";
import {
  officialDailyCreditQuotaForUser,
  startOfUtcDay,
} from "@/lib/officialQuota";
import { resolveBillingUserId } from "@/lib/serverIdentity";
import { optionalUser } from "@/lib/supabase/guard";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await optionalUser();
  const billingUserId = resolveBillingUserId(auth.userId, req);

  try {
    const dailyQuota = officialDailyCreditQuotaForUser(billingUserId);
    return NextResponse.json(await getBillingSummaryForUser({
      userId: billingUserId,
      dailyLimit: dailyQuota.limit,
      dailyUnlimited: dailyQuota.unlimited,
      since: startOfUtcDay(),
      resetsAt: new Date(startOfUtcDay().getTime() + 24 * 60 * 60 * 1000).toISOString(),
      limit: 20,
    }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Billing store unavailable";
    console.warn("[billing-summary] unavailable:", message);
    const dailyQuota = officialDailyCreditQuotaForUser(billingUserId);
    return NextResponse.json({
      storageProvider: "file",
      databaseAvailable: false,
      balance: 0,
      dailyQuota: {
        limit: dailyQuota.limit,
        spent: 0,
        remaining: dailyQuota.unlimited ? 0 : dailyQuota.limit,
        resetsAt: new Date(startOfUtcDay().getTime() + 24 * 60 * 60 * 1000).toISOString(),
        unlimited: dailyQuota.unlimited,
      },
      recentUsage: [],
      recentLedger: [],
    });
  }
}
