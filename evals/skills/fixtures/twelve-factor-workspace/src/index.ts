import { createApp } from "./app";
import { createDbPool } from "./lib/db-pool";
import { createHttpServer } from "./lib/http-server";
import { startServer } from "./server";

const databaseHost = process.env.NODE_ENV === "production" ? "prod-db.internal.example.com" : "localhost";

const pool = createDbPool({
  connectionString: process.env.DATABASE_URL ?? `postgres://${databaseHost}:5432/sessions`,
});

const app = createApp({ pool });
const server = createHttpServer({ handler: app.handle });

startServer({ server, pool, port: Number(process.env.PORT ?? "3000") });
