// Stand-in for a tiny HTTP router SDK. We do not own this API shape.

export type Request = {
  readonly method: "GET" | "POST";
  readonly path: string;
  readonly params: Readonly<Record<string, string>>;
  readonly body: unknown;
};

export type Response = {
  readonly status: number;
  readonly body?: unknown;
};

export type Handler = (request: Request) => Promise<Response>;

export type Router = {
  readonly post: (pattern: string, handler: Handler) => void;
  readonly handle: (request: Request) => Promise<Response>;
};

const matches = (pattern: string, path: string) => {
  const p = pattern.split("/");
  const s = path.split("/");
  if (p.length !== s.length) return undefined;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i += 1) {
    const segment = p[i] ?? "";
    if (segment.startsWith(":")) params[segment.slice(1)] = s[i] ?? "";
    else if (segment !== s[i]) return undefined;
  }
  return params;
};

export const createRouter = (): Router => {
  const routes: Array<{ readonly pattern: string; readonly handler: Handler }> = [];
  return {
    post: (pattern, handler) => {
      routes.push({ pattern, handler });
    },
    handle: async (request) => {
      for (const route of routes) {
        const params = matches(route.pattern, request.path);
        if (params && request.method === "POST") return route.handler({ ...request, params });
      }
      return { status: 404 };
    },
  };
};
