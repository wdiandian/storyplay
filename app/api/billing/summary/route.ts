import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { BillingRepository } from "@/lib/db/repositories/billingRepo";
import { creditLedgerEntries, modelUsageRecords } from "@/lib/db/schema";
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
    const db = getDb();
    const repo = new BillingRepository(db);
    const dailyLimit = officialDailyCreditLimit();
    const [balance, dailySpent, recentUsage, recentLedger] = await Promise.all([
      repo.getCreditBalance(billingUserId),
      repo.getCreditSpentSince(billingUserId, startOfUtcDay()),
      db
        .select()
        .from(modelUsageRecords)
        .where(eq(modelUsageRecords.userId, billingUserId))
        .orderBy(desc(modelUsageRecords.createdAt))
        .limit(20),
      db
        .select()
        .from(creditLedgerEntries)
        .where(eq(creditLedgerEntries.userId, billingUserId))
        .orderBy(desc(creditLedgerEntries.createdAt))
        .limit(20),
    ]);

    return NextResponse.json({
      balance,
      dailyQuota: {
        limit: dailyLimit,
        spent: dailySpent,
        remaining: Math.max(0, dailyLimit - dailySpent),
        resetsAt: new Date(startOfUtcDay().getTime() + 24 * 60 * 60 * 1000).toISOString(),
      },
      recentUsage,
      recentLedger,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Billing database unavailable";
    console.warn("[billing-summary] database unavailable:", message);
    return NextResponse.json(
      {
        databaseAvailable: false,
        balance: 0,
        dailyQuota: {
          limit: officialDailyCreditLimit(),
          spent: 0,
          remaining: officialDailyCreditLimit(),
          resetsAt: new Date(startOfUtcDay().getTime() + 24 * 60 * 60 * 1000).toISOString(),
        },
        recentUsage: [],
        recentLedger: [],
      },
    );
  }
}
