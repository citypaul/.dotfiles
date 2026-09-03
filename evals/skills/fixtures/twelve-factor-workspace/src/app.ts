import { createFileLogger } from "./lib/file-logger";
import type { DbPool } from "./lib/db-pool";
import type { RequestHandler } from "./lib/http-server";
import { createSession, findSession } from "./sessions";

const logger = createFileLogger({ path: process.env.LOG_FILE ?? "logs/sessions-service.log" });

const emailIn = (body: unknown): string | undefined => {
  const email = (body as { readonly email?: unknown } | null)?.email;
  return typeof email === "string" && email.length >= 3 ? email : undefined;
};

export type AppDeps = {
  readonly pool: DbPool;
};

export const createApp = ({ pool }: AppDeps): { readonly handle: RequestHandler } => {
  const handle: RequestHandler = async (request) => {
    if (request.method === "POST" && request.path === "/sessions") {
      const email = emailIn(request.body);
      if (email === undefined) return { status: 400, body: { error: "email required" } };

      const ttlMinutes = Number(process.env.SESSION_TTL_MINUTES ?? "60");
      const secureCookie = process.env.NODE_ENV === "production";
      const session = await createSession(pool, {
        email,
        ttlMinutes,
        now: new Date(),
      });
      logger.write(`session ${session.id} issued to ${email}`);
      return { status: 201, body: { id: session.id, expiresAt: session.expiresAt, secureCookie } };
    }

    if (request.method === "GET" && request.path.startsWith("/sessions/")) {
      const id = request.path.slice("/sessions/".length);
      const session = await findSession(pool, id);
      if (!session) {
        logger.write(`session ${id} not found`);
        return { status: 404, body: { error: "unknown session" } };
      }
      return { status: 200, body: { id: session.id, email: session.email, expiresAt: session.expiresAt } };
    }

    if (request.method === "GET" && request.path === "/health") {
      return { status: 200, body: { status: "ok" } };
    }

    return { status: 404, body: { error: "unknown route" } };
  };

  return { handle };
};
