import type { Hono } from "hono";
import type { AuthenticatedPrincipal } from "../application/principal";
import { problem } from "../http/respond";

export type EndpointAccess =
  | { readonly kind: "public"; readonly justification: string }
  | { readonly kind: "protected-read" };

export type EndpointContract = {
  readonly method: "get" | "post" | "put" | "patch" | "delete";
  readonly path: string;
  readonly access: EndpointAccess;
  readonly summary: string;
};

export type EntryCatalogEntry = {
  readonly method: string;
  readonly path: string;
  readonly access: EndpointAccess["kind"];
};

export type EndpointRequest<A extends EndpointAccess> = {
  readonly params: Readonly<Record<string, string>>;
  readonly request: Request;
} & (A extends { readonly kind: "public" }
  ? unknown
  : { readonly principal: AuthenticatedPrincipal });

export type HandlerFor<C extends EndpointContract> = (
  request: EndpointRequest<C["access"]>,
) => Promise<Response>;

type ResolvePrincipal = (
  request: Request,
) => Promise<AuthenticatedPrincipal | undefined>;

type MountedHandler = (request: {
  readonly params: Readonly<Record<string, string>>;
  readonly request: Request;
  readonly principal?: AuthenticatedPrincipal;
}) => Promise<Response>;

const toFrameworkPath = (path: string): string =>
  path.replace(/\{(\w+)\}/g, ":$1");

const assertNever = (value: never): never => {
  throw new Error(`entry point with no access declaration: ${JSON.stringify(value)}`);
};

export const createEndpointRegistrar = ({
  app,
  resolvePrincipal,
}: {
  readonly app: Hono;
  readonly resolvePrincipal: ResolvePrincipal;
}) => {
  const entries: EntryCatalogEntry[] = [];

  const register = <C extends EndpointContract>(
    contract: C,
    handler: HandlerFor<C>,
  ): void => {
    const invoke = handler as unknown as MountedHandler;
    const method = contract.method.toUpperCase();
    const path = toFrameworkPath(contract.path);

    switch (contract.access.kind) {
      case "public":
        app.on(method, path, (c) =>
          invoke({ params: c.req.param(), request: c.req.raw }),
        );
        break;
      case "protected-read":
        app.on(method, path, async (c) => {
          const principal = await resolvePrincipal(c.req.raw);
          if (principal === undefined) {
            return problem(401, "Sign in required", {
              "www-authenticate": "Session",
            });
          }
          return invoke({ params: c.req.param(), request: c.req.raw, principal });
        });
        break;
      default:
        return assertNever(contract.access);
    }

    entries.push({ method, path: contract.path, access: contract.access.kind });
  };

  return {
    register,
    catalog: (): readonly EntryCatalogEntry[] => [...entries],
  };
};
