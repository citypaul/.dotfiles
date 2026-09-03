import { Database } from "./lib/database";

export type IssuedKey = { readonly token: string; readonly expiresAt: number };

export type IssueResult =
  | { readonly ok: true; readonly key: IssuedKey }
  | { readonly ok: false; readonly reason: "limit-reached" };

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ACTIVE_KEYS = 5;

export const issueApiKey = async (accountId: string, label: string): Promise<IssueResult> => {
  const db = new Database(process.env.DATABASE_URL ?? "");
  const now = Date.now();
  const ttlDays = Number(process.env.API_KEY_TTL_DAYS ?? "30");
  const existing = await db.apiKeysFor(accountId);
  const active = existing.filter((row) => row.revoked_at === null && row.expires_at > now);
  if (active.length >= MAX_ACTIVE_KEYS) return { ok: false, reason: "limit-reached" };
  const row = await db.insertApiKey({
    account_id: accountId,
    label: label.trim().toLowerCase(),
    issued_at: now,
    expires_at: now + ttlDays * DAY_MS,
    revoked_at: null,
  });
  return { ok: true, key: { token: `ak_${row.id}_${now.toString(36)}`, expiresAt: row.expires_at } };
};
