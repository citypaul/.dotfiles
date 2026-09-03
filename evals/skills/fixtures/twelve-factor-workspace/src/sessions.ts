import { createFileLogger } from "./lib/file-logger";
import type { DbPool } from "./lib/db-pool";

const logger = createFileLogger({ path: process.env.LOG_FILE ?? "logs/sessions-service.log" });

export type Session = {
  readonly id: string;
  readonly email: string;
  readonly expiresAt: string;
};

const recent = new Map<string, Session>();

export const createSession = async (
  pool: DbPool,
  input: { readonly email: string; readonly ttlMinutes: number; readonly now: Date },
): Promise<Session> => {
  const session: Session = {
    id: crypto.randomUUID(),
    email: input.email,
    expiresAt: new Date(input.now.getTime() + input.ttlMinutes * 60_000).toISOString(),
  };
  await pool.query("insert into sessions (id, email, expires_at) values ($1, $2, $3)", [
    session.id,
    session.email,
    session.expiresAt,
  ]);
  recent.set(session.id, session);
  logger.write(`created session ${session.id} for ${input.email}`);
  return session;
};

export const findSession = async (pool: DbPool, id: string): Promise<Session | undefined> => {
  const cached = recent.get(id);
  if (cached) return cached;
  const result = await pool.query("select id, email, expires_at from sessions where id = $1", [id]);
  const row = result.rows[0];
  if (!row) return undefined;
  return {
    id: String(row["id"]),
    email: String(row["email"]),
    expiresAt: String(row["expires_at"]),
  };
};
