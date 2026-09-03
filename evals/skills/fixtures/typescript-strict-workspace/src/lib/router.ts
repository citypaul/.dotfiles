// Stand-in for a tiny HTTP router SDK. We do not own this API shape. Bodies
// arrive already JSON-decoded, exactly as the client sent them.

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
  readonly get: (pattern: string, handler: Handler) => void;
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
  const routes: Array<{ readonly method: Request["method"]; readonly pattern: string; readonly handler: Handler }> = [];
  const register = (method: Request["method"]) => (pattern: string, handler: Handler) => {
    routes.push({ method, pattern, handler });
  };
  return {
    get: register("GET"),
    post: register("POST"),
    handle: async (request) => {
      for (const route of routes) {
        const params = matches(route.pattern, request.path);
        if (params && request.method === route.method) return route.handler({ ...request, params });
      }
      return { status: 404 };
    },
  };
};
