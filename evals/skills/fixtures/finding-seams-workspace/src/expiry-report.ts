import { formatRelativeDays, sortByExpiry } from "./format";
import { Database } from "./lib/database";

const DAY_MS = 24 * 60 * 60 * 1000;

export const expiringKeysReport = async (accountId: string): Promise<ReadonlyArray<string>> => {
  const db = new Database(process.env.DATABASE_URL ?? "");
  const now = Date.now();
  const warningDays = Number(process.env.EXPIRY_WARNING_DAYS ?? "7");
  const horizon = now + warningDays * DAY_MS;
  const rows = await db.apiKeysFor(accountId);
  const expiring = rows.filter((row) => row.revoked_at === null && row.expires_at > now && row.expires_at <= horizon);
  return sortByExpiry(expiring).map((row) => `${row.label}: expires ${formatRelativeDays(row.expires_at - now)}`);
};
