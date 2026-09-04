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
  readonly extraParams?: Readonly<Record<string, string>>;
  readonly codeVerifier?: string;
};

// The SDK stand-in carries everything past `code`/`redirectUri` in
// `extraParams`, sent as-is in the token-request body, so a PKCE verifier
// arrives as `code_verifier`. A differently spelled key and a widened SDK type
// are both accepted: what is graded is the S256 relation to the challenge, not
// where the implementation chose to put the value.
const verifierOf = (exchange: Exchange | undefined): string =>
  exchange?.extraParams?.code_verifier ?? exchange?.extraParams?.codeVerifier ?? exchange?.codeVerifier ?? "";

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

// Base-aware, so an implementation that answers with a relative Location is
// read the same way as one that answers with an absolute URL.
const locationOf = (response: Response) => new URL(response.headers.get("location") ?? "about:blank", APP_BASE_URL);
const isRedirect = (response: Response) => response.status === 302 || response.status === 303;
const callbackPath = (state: string, code: string, extra = "") =>
  `/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}${extra}`;

const PARTNER_ISSUER = "https://id.partner.example";
const PARTNER_CLIENT_ID = "portal-partner";
const CONFIG = { redirectUri: REDIRECT_URI, appBaseUrl: APP_BASE_URL };

const orgs = {
  company: { issuer: ISSUER, clientId: CLIENT_ID, email: "ada@example.com" },
  partner: { issuer: PARTNER_ISSUER, clientId: PARTNER_CLIENT_ID, email: "grace@partner.example" },
} as const;

const portal = () => {
  const company = createProvider({ issuer: ISSUER, clientId: CLIENT_ID });
  const partner = createProvider({ issuer: PARTNER_ISSUER, clientId: PARTNER_CLIENT_ID });
  const app = createApp({
    providers: { company: company.client, partner: partner.client },
    config: CONFIG,
  });
  return { company, partner, app };
};

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

const signIn = async (underTest: ReturnType<typeof portal>, org: keyof typeof orgs) => {
  const browser = openBrowser(underTest.app);
  const login = await browser.visit(`/auth/login?org=${org}`);
  const authUrl = locationOf(login);
  underTest[org].issue(claimsFor(org, authUrl));
  const callback = await browser.visit(callbackPath(authUrl.searchParams.get("state") ?? "", "code-1"));
  return { browser, login, authUrl, callback };
};

const SECRETS = ["AT-9f3", "RT-4c1"];

const leaks = async (response: Response) => {
  const surfaces = [
    response.headers.get("location") ?? "",
    setCookies(response).join(" | "),
    await response.clone().text(),
  ].join("\n");
  return SECRETS.filter((secret) => surfaces.includes(secret));
};

describe("acceptance: neither organisation's tokens reach the browser", () => {
  it("keeps the partner's tokens out of the redirect back into the app", async () => {
    const underTest = portal();
    const { login, callback } = await signIn(underTest, "partner");

    expect(await leaks(login)).toEqual([]);
    expect(await leaks(callback)).toEqual([]);
    expect([307, 308]).not.toContain(callback.status);
  });

  it("keeps the company's tokens out of the redirect back into the app", async () => {
    const underTest = portal();
    const { login, callback } = await signIn(underTest, "company");

    expect(await leaks(login)).toEqual([]);
    expect(await leaks(callback)).toEqual([]);
    expect([307, 308]).not.toContain(callback.status);
  });

  it("keeps them out of anything a signed-in partner can read", async () => {
    const underTest = portal();
    const { browser } = await signIn(underTest, "partner");
    const me = await browser.visit("/me");

    expect(me.status).toBe(200);
    expect(await leaks(me)).toEqual([]);
  });
});
