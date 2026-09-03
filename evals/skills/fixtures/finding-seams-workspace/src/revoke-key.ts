import { Database } from "./lib/database";

export type RevokeOutcome = "revoked" | "not-found" | "already-revoked";

export const revokeApiKey = async (accountId: string, keyId: number): Promise<RevokeOutcome> => {
  const db = new Database(process.env.DATABASE_URL ?? "");
  const rows = await db.apiKeysFor(accountId);
  const row = rows.find((candidate) => candidate.id === keyId);
  if (row === undefined) return "not-found";
  if (row.revoked_at !== null) return "already-revoked";
  await db.revokeApiKey(keyId, Date.now());
  return "revoked";
};
