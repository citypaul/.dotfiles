import type { AuthenticatedPrincipal } from "./application/principal";

export type SessionRecord = {
  readonly sessionId: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly email: string;
  readonly accessToken: string;
  readonly groups: readonly string[];
  readonly expiresAt: number;
};

export type SessionStore = {
  readonly find: (sessionId: string) => Promise<SessionRecord | undefined>;
};

export const SESSION_COOKIE = "__Host-session";

const readCookie = (header: string | null, name: string): string | undefined =>
  (header ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${name}=`))
    .map((part) => part.slice(name.length + 1))[0];

export const createSessionResolver =
  (sessions: SessionStore) =>
  async (request: Request): Promise<AuthenticatedPrincipal | undefined> => {
    const sessionId = readCookie(request.headers.get("cookie"), SESSION_COOKIE);
    if (sessionId === undefined) return undefined;
    const record = await sessions.find(sessionId);
    if (record === undefined || record.expiresAt <= Date.now()) return undefined;
    return { userId: record.userId, tenantId: record.tenantId };
  };
