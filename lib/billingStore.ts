import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { BillingRepository } from "@/lib/db/repositories/billingRepo";
import {
  creditLedgerEntries,
  modelUsageRecords,
  type CreditLedgerEntry,
  type ModelUsageRecord,
  type NewCreditLedgerEntry,
  type NewModelUsageRecord,
} from "@/lib/db/schema";

export type BillingStorageProvider = "db" | "file";

export type BillingSummary = {
  storageProvider: BillingStorageProvider;
  databaseAvailable: boolean;
  balance: number;
  dailyQuota: {
    limit: number;
    spent: number;
    remaining: number;
    resetsAt: string;
  };
  recentUsage: ModelUsageRecord[];
  recentLedger: CreditLedgerEntry[];
};

const billingStorePath = path.join(process.cwd(), ".storyplay", "billing", "usage-ledger.json");

type StoredUsageRecord = Omit<ModelUsageRecord, "createdAt"> & { createdAt: string };
type StoredLedgerEntry = Omit<CreditLedgerEntry, "createdAt"> & { createdAt: string };

type StoredBillingFile = {
  version: 1;
  updatedAt: string;
  usageRecords: Record<string, StoredUsageRecord>;
  ledgerEntries: Record<string, StoredLedgerEntry>;
};

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function serializeUsage(record: NewModelUsageRecord): StoredUsageRecord {
  return {
    id: record.id,
    userId: record.userId,
    accessMode: record.accessMode ?? "official",
    feature: record.feature,
    domainsJson: record.domainsJson,
    modelsJson: record.modelsJson,
    status: record.status,
    durationMs: record.durationMs,
    metadataJson: record.metadataJson ?? "{}",
    resultJson: record.resultJson ?? "{}",
    creditsCharged: record.creditsCharged ?? 0,
    createdAt: toDate(record.createdAt ?? new Date()).toISOString(),
  };
}

function serializeLedger(entry: NewCreditLedgerEntry): StoredLedgerEntry {
  return {
    id: entry.id,
    userId: entry.userId,
    usageRecordId: entry.usageRecordId ?? null,
    kind: entry.kind,
    amount: entry.amount,
    feature: entry.feature ?? null,
    reason: entry.reason,
    createdAt: toDate(entry.createdAt ?? new Date()).toISOString(),
  };
}

function normalizeUsage(record: StoredUsageRecord): ModelUsageRecord {
  return {
    ...record,
    createdAt: toDate(record.createdAt),
  };
}

function normalizeLedger(entry: StoredLedgerEntry): CreditLedgerEntry {
  return {
    ...entry,
    createdAt: toDate(entry.createdAt),
  };
}

async function readBillingFile(): Promise<StoredBillingFile> {
  try {
    const raw = await readFile(billingStorePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoredBillingFile>;
    return {
      version: 1,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
      usageRecords:
        typeof parsed.usageRecords === "object" &&
        parsed.usageRecords !== null &&
        !Array.isArray(parsed.usageRecords)
          ? (parsed.usageRecords as Record<string, StoredUsageRecord>)
          : {},
      ledgerEntries:
        typeof parsed.ledgerEntries === "object" &&
        parsed.ledgerEntries !== null &&
        !Array.isArray(parsed.ledgerEntries)
          ? (parsed.ledgerEntries as Record<string, StoredLedgerEntry>)
          : {},
    };
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return {
        version: 1,
        updatedAt: new Date(0).toISOString(),
        usageRecords: {},
        ledgerEntries: {},
      };
    }

    throw error;
  }
}

async function writeBillingFile(file: Pick<StoredBillingFile, "usageRecords" | "ledgerEntries">) {
  await mkdir(path.dirname(billingStorePath), { recursive: true });
  await writeFile(
    billingStorePath,
    JSON.stringify(
      {
        version: 1,
        updatedAt: new Date().toISOString(),
        usageRecords: file.usageRecords,
        ledgerEntries: file.ledgerEntries,
      } satisfies StoredBillingFile,
      null,
      2,
    ),
    "utf8",
  );
}

async function withBillingDb<T>(operation: (repo: BillingRepository, db: ReturnType<typeof getDb>) => Promise<T>) {
  const db = getDb();
  const repo = new BillingRepository(db);
  return operation(repo, db);
}

export async function createBillingUsageRecord(record: NewModelUsageRecord): Promise<BillingStorageProvider> {
  try {
    await withBillingDb((repo) => repo.createUsageRecord(record));
    return "db";
  } catch {
    const file = await readBillingFile();
    await writeBillingFile({
      usageRecords: {
        ...file.usageRecords,
        [record.id]: serializeUsage(record),
      },
      ledgerEntries: file.ledgerEntries,
    });
    return "file";
  }
}

export async function createBillingLedgerEntry(entry: NewCreditLedgerEntry): Promise<BillingStorageProvider> {
  try {
    await withBillingDb((repo) => repo.createLedgerEntry(entry));
    return "db";
  } catch {
    const file = await readBillingFile();
    await writeBillingFile({
      usageRecords: file.usageRecords,
      ledgerEntries: {
        ...file.ledgerEntries,
        [entry.id]: serializeLedger(entry),
      },
    });
    return "file";
  }
}

export async function getBillingCreditBalance(userId: string): Promise<number> {
  try {
    return await withBillingDb((repo) => repo.getCreditBalance(userId));
  } catch {
    const file = await readBillingFile();
    return Object.values(file.ledgerEntries)
      .filter((entry) => entry.userId === userId)
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  }
}

export async function getBillingCreditSpentSince(userId: string, since: Date): Promise<number> {
  try {
    return await withBillingDb((repo) => repo.getCreditSpentSince(userId, since));
  } catch {
    const sinceMs = since.getTime();
    const file = await readBillingFile();
    return Object.values(file.ledgerEntries)
      .filter((entry) => {
        const createdAt = toDate(entry.createdAt).getTime();
        return entry.userId === userId && entry.amount < 0 && createdAt >= sinceMs;
      })
      .reduce((sum, entry) => sum + Math.abs(Number(entry.amount || 0)), 0);
  }
}

export async function getBillingSummaryForUser(input: {
  userId: string;
  dailyLimit: number;
  since: Date;
  resetsAt: string;
  limit?: number;
}): Promise<BillingSummary> {
  const limit = input.limit ?? 20;
  try {
    return await withBillingDb(async (repo, db) => {
      const [balance, dailySpent, recentUsage, recentLedger] = await Promise.all([
        repo.getCreditBalance(input.userId),
        repo.getCreditSpentSince(input.userId, input.since),
        db
          .select()
          .from(modelUsageRecords)
          .where(eq(modelUsageRecords.userId, input.userId))
          .orderBy(desc(modelUsageRecords.createdAt))
          .limit(limit),
        db
          .select()
          .from(creditLedgerEntries)
          .where(eq(creditLedgerEntries.userId, input.userId))
          .orderBy(desc(creditLedgerEntries.createdAt))
          .limit(limit),
      ]);

      return {
        storageProvider: "db",
        databaseAvailable: true,
        balance,
        dailyQuota: {
          limit: input.dailyLimit,
          spent: dailySpent,
          remaining: Math.max(0, input.dailyLimit - dailySpent),
          resetsAt: input.resetsAt,
        },
        recentUsage,
        recentLedger,
      };
    });
  } catch {
    const file = await readBillingFile();
    const sinceMs = input.since.getTime();
    const usage = Object.values(file.usageRecords)
      .map(normalizeUsage)
      .filter((record) => record.userId === input.userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const ledger = Object.values(file.ledgerEntries)
      .map(normalizeLedger)
      .filter((entry) => entry.userId === input.userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const balance = ledger.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const dailySpent = ledger
      .filter((entry) => entry.amount < 0 && entry.createdAt.getTime() >= sinceMs)
      .reduce((sum, entry) => sum + Math.abs(Number(entry.amount || 0)), 0);

    return {
      storageProvider: "file",
      databaseAvailable: false,
      balance,
      dailyQuota: {
        limit: input.dailyLimit,
        spent: dailySpent,
        remaining: Math.max(0, input.dailyLimit - dailySpent),
        resetsAt: input.resetsAt,
      },
      recentUsage: usage.slice(0, limit),
      recentLedger: ledger.slice(0, limit),
    };
  }
}
