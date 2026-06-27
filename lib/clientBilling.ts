"use client";

import { guestHeaders } from "@/lib/guestId";

export type BillingSummary = {
  balance: number;
  dailyQuota: {
    limit: number;
    spent: number;
    remaining: number;
    resetsAt: string;
  };
  recentUsage: unknown[];
  recentLedger: unknown[];
};

export async function fetchBillingSummary(): Promise<BillingSummary> {
  const res = await fetch("/api/billing/summary", {
    method: "GET",
    headers: guestHeaders(),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<BillingSummary> & {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return {
    balance: Number(data.balance ?? 0),
    dailyQuota: {
      limit: Number(data.dailyQuota?.limit ?? 0),
      spent: Number(data.dailyQuota?.spent ?? 0),
      remaining: Number(data.dailyQuota?.remaining ?? 0),
      resetsAt: String(data.dailyQuota?.resetsAt ?? ""),
    },
    recentUsage: Array.isArray(data.recentUsage) ? data.recentUsage : [],
    recentLedger: Array.isArray(data.recentLedger) ? data.recentLedger : [],
  };
}
