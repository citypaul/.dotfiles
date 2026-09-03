// Static server for the built app plus the small JSON API it talks to.
// No dependencies and no network access: `pnpm build && pnpm serve` is all the
// Playwright config needs.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = Number.parseInt(process.env.PORT ?? "4317", 10);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

const json = (response, status, body) => {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
};

const readBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text === "" ? {} : JSON.parse(text);
};

let orderCount = 1041;

const api = async (request, response, path) => {
  if (request.method === "POST" && path === "/api/orders") {
    const body = await readBody(request);
    if (!Array.isArray(body.lines) || body.lines.length === 0) {
      return json(response, 422, { message: "an order needs at least one line" });
    }
    orderCount += 1;
    return json(response, 201, { reference: `GS-${orderCount}` });
  }
  if (request.method === "POST" && path === "/api/signups") {
    const body = await readBody(request);
    if (typeof body.email !== "string" || !body.email.includes("@")) {
      return json(response, 422, { message: "a signup needs an email address" });
    }
    return json(response, 201, { id: `signup-${Date.now()}` });
  }
  return json(response, 404, { message: `no route for ${request.method} ${path}` });
};

const staticFile = async (response, path) => {
  const file =
    path === "/"
      ? join(root, "public", "index.html")
      : path.startsWith("/app/")
        ? join(root, "dist-web", normalize(path.slice("/app/".length)))
        : join(root, "public", normalize(path.slice(1)));
  try {
    const body = await readFile(file);
    response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end(`not found: ${path}`);
  }
};

createServer((request, response) => {
  const path = new URL(request.url, "http://localhost").pathname;
  const handled = path.startsWith("/api/")
    ? api(request, response, path)
    : staticFile(response, path);
  handled.catch((error) => {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end(String(error));
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`gearshop on http://127.0.0.1:${port}`);
});
