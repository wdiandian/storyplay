import "server-only";

import { and, eq, gte, lt, sql } from "drizzle-orm";
import type { DbInstance } from "../client";
import {
  creditLedgerEntries,
  modelUsageRecords,
  type NewCreditLedgerEntry,
  type NewModelUsageRecord,
} from "../schema";

export class BillingRepository {
  constructor(private db: DbInstance) {}

  async createUsageRecord(record: NewModelUsageRecord): Promise<void> {
    await this.db.insert(modelUsageRecords).values(record);
  }

  async createLedgerEntry(entry: NewCreditLedgerEntry): Promise<void> {
    await this.db.insert(creditLedgerEntries).values(entry);
  }

  async setUsageCreditsCharged(id: string, creditsCharged: number): Promise<void> {
    await this.db
      .update(modelUsageRecords)
      .set({ creditsCharged })
      .where(eq(modelUsageRecords.id, id));
  }

  async getCreditBalance(userId: string): Promise<number> {
    const rows = await this.db
      .select({ balance: sql<number>`coalesce(sum(${creditLedgerEntries.amount}), 0)` })
      .from(creditLedgerEntries)
      .where(eq(creditLedgerEntries.userId, userId));
    return Number(rows[0]?.balance ?? 0);
  }

  async getCreditSpentSince(userId: string, since: Date): Promise<number> {
    const rows = await this.db
      .select({
        spent: sql<number>`coalesce(sum(-${creditLedgerEntries.amount}), 0)`,
      })
      .from(creditLedgerEntries)
      .where(
        and(
          eq(creditLedgerEntries.userId, userId),
          lt(creditLedgerEntries.amount, 0),
          gte(creditLedgerEntries.createdAt, since),
        ),
      );
    return Number(rows[0]?.spent ?? 0);
  }
}
