// Hidden acceptance test. Copied into the workspace at grade time; it drives
// the app the request pins (`createApp` in src/index.ts, `GET /auth/login`,
// `GET /auth/callback`, `GET /me`) and nothing else. How the transaction is
// carried between the two requests, where the session lives and what the
// module boundaries are is the implementation's own business.
import { describe, expect, it } from "vitest";
import { createApp } from "./index";

const ISSUER = "https://id.example.com";
const CLIENT_ID = "portal-web";
const REDIRECT_URI = "https://portal.example.com/auth/callback";
const APP_BASE_URL = "https://portal.example.com";

const seconds = () => Math.floor(Date.now() / 1000);
const b64url = (value: string) => Buffer.from(value, "utf8").toString("base64url");
const jwt = (claims: Record<string, unknown>) =>
  `${b64url(JSON.stringify({ alg: "RS256", kid: "k1", typ: "JWT" }))}.${b64url(JSON.stringify(claims))}.c2ln`;

type Exchange = {
  readonly code: string;
  readonly redirectUri: string;
  readonly codeVerifier?: string;
};

const createProvider = (options: { issuer: string; clientId: string; tokens?: Record<string, string> } ) => {
  const exchanges: Exchange[] = [];
  let claims: Record<string, unknown> = {};
  const tokens = options.tokens ?? { accessToken: "AT-9f3", refreshToken: "RT-4c1" };
  return {
    exchanges,
    issue: (next: Record<string, unknown>) => {
      claims = next;
    },
    client: {
      clientId: options.clientId,
      metadata: {
        issuer: options.issuer,
        authorizationEndpoint: `${options.issuer}/authorize`,
        tokenEndpoint: `${options.issuer}/token`,
      },
      exchangeCode: async (request: Exchange) => {
        exchanges.push(request);
        return {
          accessToken: tokens.accessToken ?? "AT-9f3",
          idToken: jwt(claims),
          refreshToken: tokens.refreshToken ?? "RT-4c1",
          expiresIn: 3600,
        };
      },
      verifyIdTokenSignature: async (idToken: string) =>
        JSON.parse(Buffer.from(idToken.split(".")[1] ?? "", "base64url").toString("utf8")) as Record<string, unknown>,
    },
  };
};

const setCookies = (response: Response): ReadonlyArray<string> => {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const single = response.headers.get("set-cookie");
  return single === null ? [] : [single];
};

// One browser: it keeps whatever cookies it is given and sends them back.
const openBrowser = (app: { request: (path: string, init?: RequestInit) => Promise<Response> }) => {
  const jar = new Map<string, string>();
  return {
    cookies: () => [...jar].map(([name, value]) => `${name}=${value}`).join("; "),
    visit: async (path: string) => {
      const cookie = [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
      const response = await app.request(path, cookie === "" ? {} : { headers: { cookie } });
      for (const raw of setCookies(response)) {
        const pair = raw.split(";")[0] ?? "";
        const at = pair.indexOf("=");
        if (at > 0) jar.set(pair.slice(0, at).trim(), pair.slice(at + 1));
      }
      return response;
    },
  };
};

const locationOf = (response: Response) => new URL(response.headers.get("location") ?? "about:blank");
const isRedirect = (response: Response) => response.status === 302 || response.status === 303;
const callbackPath = (state: string, code: string, extra = "") =>
  `/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}${extra}`;

const PARTNER_ISSUER = "https://id.partner.example";
const PARTNER_CLIENT_ID = "portal-partner";
const CONFIG = { redirectUri: REDIRECT_URI, appBaseUrl: APP_BASE_URL };

const portal = () => {
  const company = createProvider({ issuer: ISSUER, clientId: CLIENT_ID });
  const partner = createProvider({ issuer: PARTNER_ISSUER, clientId: PARTNER_CLIENT_ID });
  const app = createApp({
    providers: { company: company.client, partner: partner.client },
    config: CONFIG,
  });
  return { company, partner, app };
};

const orgs = {
  company: { issuer: ISSUER, clientId: CLIENT_ID, email: "ada@example.com" },
  partner: { issuer: PARTNER_ISSUER, clientId: PARTNER_CLIENT_ID, email: "grace@partner.example" },
} as const;

const claimsFor = (org: keyof typeof orgs, authUrl: URL, overrides: Record<string, unknown> = {}) => {
  const nonce = authUrl.searchParams.get("nonce");
  return {
    iss: orgs[org].issuer,
    sub: `${org}-user-1`,
    aud: orgs[org].clientId,
    email: orgs[org].email,
    iat: seconds(),
    exp: seconds() + 300,
    ...(nonce === null ? {} : { nonce }),
    ...overrides,
  };
};

const signIn = async (
  underTest: ReturnType<typeof portal>,
  org: keyof typeof orgs,
  options: { overrides?: Record<string, unknown>; extra?: string } = {},
) => {
  const browser = openBrowser(underTest.app);
  const login = await browser.visit(`/auth/login?org=${org}`);
  const authUrl = locationOf(login);
  underTest[org].issue(claimsFor(org, authUrl, options.overrides ?? {}));
  const callback = await browser.visit(
    callbackPath(authUrl.searchParams.get("state") ?? "", "code-1", options.extra ?? ""),
  );
  return { browser, login, authUrl, callback };
};

describe("acceptance: the provider a sign-in started with decides how it ends", () => {
  it("signs the partner in when the ID token comes from the partner's issuer", async () => {
    const underTest = portal();
    const { browser } = await signIn(underTest, "partner");

    expect((await browser.visit("/me")).status).toBe(200);
  });

  it("refuses an ID token issued by the other provider", async () => {
    const underTest = portal();
    const { browser } = await signIn(underTest, "partner", {
      overrides: { iss: ISSUER },
    });

    expect((await browser.visit("/me")).status).toBe(401);
  });

  it("refuses an ID token minted for the other provider's client", async () => {
    const underTest = portal();
    const { browser } = await signIn(underTest, "partner", {
      overrides: { aud: CLIENT_ID },
    });

    expect((await browser.visit("/me")).status).toBe(401);
  });

  it("ignores an organisation named on the callback instead of the one the sign-in started with", async () => {
    const underTest = portal();
    const { browser } = await signIn(underTest, "partner", { extra: "&org=company" });

    expect(underTest.company.exchanges).toHaveLength(0);

    const me = await browser.visit("/me");
    const body = me.status === 200 ? await me.text() : "";

    expect(body).not.toContain("ada@example.com");
  });
});
