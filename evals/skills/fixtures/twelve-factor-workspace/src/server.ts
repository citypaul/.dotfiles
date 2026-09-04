import { createFileLogger } from "./lib/file-logger";
import type { DbPool } from "./lib/db-pool";
import type { HttpServer } from "./lib/http-server";

const logger = createFileLogger({ path: process.env.LOG_FILE ?? "logs/sessions-service.log" });

export type ServerDeps = {
  readonly server: HttpServer;
  readonly pool: DbPool;
  readonly port: number;
};

export const startServer = ({ server, pool, port }: ServerDeps): HttpServer => {
  server.listen(port);
  void pool.query("select 1");
  logger.write(`listening on port ${port}`);
  return server;
};
