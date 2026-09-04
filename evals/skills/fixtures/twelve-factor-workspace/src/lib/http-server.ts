// Stand-in for a minimal HTTP server SDK. We do not own this API shape.

export type ServerRequest = {
  readonly method: "GET" | "POST" | "DELETE";
  readonly path: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: unknown;
};

export type ServerResponse = {
  readonly status: number;
  readonly body?: unknown;
};

export type RequestHandler = (request: ServerRequest) => Promise<ServerResponse>;

export type HttpServer = {
  readonly listen: (port: number) => void;
  readonly close: () => Promise<void>;
  readonly inject: (request: ServerRequest) => Promise<ServerResponse>;
};

export const createHttpServer = ({ handler }: { handler: RequestHandler }): HttpServer => {
  const inFlight = new Set<Promise<ServerResponse>>();
  let listening = false;

  return {
    listen: (_port) => {
      listening = true;
    },
    close: async () => {
      listening = false;
      await Promise.allSettled([...inFlight]);
    },
    inject: async (request) => {
      if (!listening) return { status: 503, body: { error: "not listening" } };
      const pending = handler(request);
      inFlight.add(pending);
      try {
        return await pending;
      } finally {
        inFlight.delete(pending);
      }
    },
  };
};
