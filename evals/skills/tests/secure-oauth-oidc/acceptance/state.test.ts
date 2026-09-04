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

const CONFIG = { redirectUri: REDIRECT_URI, appBaseUrl: APP_BASE_URL };

const portal = () => {
  const provider = createProvider({ issuer: ISSUER, clientId: CLIENT_ID });
  return { provider, app: createApp({ provider: provider.client, config: CONFIG }) };
};

const claimsFor = (authUrl: URL, overrides: Record<string, unknown> = {}) => {
  const nonce = authUrl.searchParams.get("nonce");
  return {
    iss: ISSUER,
    sub: "user-1",
    aud: CLIENT_ID,
    email: "ada@example.com",
    iat: seconds(),
    exp: seconds() + 300,
    ...(nonce === null ? {} : { nonce }),
    ...overrides,
  };
};

const signIn = async (
  underTest: ReturnType<typeof portal>,
  overrides: Record<string, unknown> = {},
  code = "code-1",
) => {
  const browser = openBrowser(underTest.app);
  const login = await browser.visit("/auth/login");
  const authUrl = locationOf(login);
  underTest.provider.issue(claimsFor(authUrl, overrides));
  const callback = await browser.visit(callbackPath(authUrl.searchParams.get("state") ?? "", code));
  return { browser, login, authUrl, callback };
};

const start = async (underTest: ReturnType<typeof portal>) => {
  const browser = openBrowser(underTest.app);
  const authUrl = locationOf(await browser.visit("/auth/login"));
  underTest.provider.issue(claimsFor(authUrl));
  return { browser, authUrl, state: authUrl.searchParams.get("state") ?? "" };
};

describe("acceptance: the state ties the callback to the sign-in that started it", () => {
  it("is unguessable and different for every sign-in", async () => {
    const underTest = portal();
    const first = (await start(underTest)).state;
    const second = (await start(underTest)).state;

    expect(first.length).toBeGreaterThanOrEqual(16);
    expect(first).not.toBe(second);
  });

  it("refuses a callback from a browser that never started a sign-in", async () => {
    const underTest = portal();
    const { state } = await start(underTest);
    const attacker = openBrowser(underTest.app);

    await attacker.visit(callbackPath(state, "code-1"));

    expect(underTest.provider.exchanges).toHaveLength(0);
    expect((await attacker.visit("/me")).status).toBe(401);
  });

  it("refuses a callback whose state is not the one it handed out", async () => {
    const underTest = portal();
    const { browser } = await start(underTest);

    await browser.visit(callbackPath("sign-in", "code-1"));

    expect(underTest.provider.exchanges).toHaveLength(0);
    expect((await browser.visit("/me")).status).toBe(401);
  });

  it("accepts the callback once and never again", async () => {
    const underTest = portal();
    const { browser, state } = await start(underTest);

    await browser.visit(callbackPath(state, "code-1"));
    expect(underTest.provider.exchanges).toHaveLength(1);

    await browser.visit(callbackPath(state, "code-1"));
    expect(underTest.provider.exchanges).toHaveLength(1);
  });
});
