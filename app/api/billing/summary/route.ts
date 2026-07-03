import { NextResponse } from "next/server";
import { getBillingSummaryForUser } from "@/lib/billingStore";
import {
  officialDailyCreditLimit,
  startOfUtcDay,
} from "@/lib/officialQuota";
import { resolveBillingUserId } from "@/lib/serverIdentity";
import { optionalUser } from "@/lib/supabase/guard";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await optionalUser();
  const billingUserId = resolveBillingUserId(auth.userId, req);

  try {
    const dailyLimit = officialDailyCreditLimit();
    return NextResponse.json(await getBillingSummaryForUser({
      userId: billingUserId,
      dailyLimit,
      since: startOfUtcDay(),
      resetsAt: new Date(startOfUtcDay().getTime() + 24 * 60 * 60 * 1000).toISOString(),
      limit: 20,
    }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Billing store unavailable";
    console.warn("[billing-summary] unavailable:", message);
    const dailyLimit = officialDailyCreditLimit();
    return NextResponse.json({
      storageProvider: "file",
      databaseAvailable: false,
      balance: 0,
      dailyQuota: {
        limit: dailyLimit,
        spent: 0,
        remaining: dailyLimit,
        resetsAt: new Date(startOfUtcDay().getTime() + 24 * 60 * 60 * 1000).toISOString(),
      },
      recentUsage: [],
      recentLedger: [],
    });
  }
}
