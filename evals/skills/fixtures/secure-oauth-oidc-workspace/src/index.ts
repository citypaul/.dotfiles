import { Hono } from "hono";
import { buildSignInUrl, finishSignIn, type AuthConfig } from "./auth";
import type { OpenIdProviderClient } from "./lib/openid-provider";

export type AppDeps = {
  readonly provider: OpenIdProviderClient;
  readonly config: AuthConfig;
};

export const createApp = (deps: AppDeps): Hono => {
  const app = new Hono();

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.get("/auth/login", (c) => c.redirect(buildSignInUrl(deps.provider, deps.config)));

  app.get("/auth/callback", async (c) => {
    const user = await finishSignIn(deps.provider, deps.config, {
      code: c.req.query("code") ?? "",
      state: c.req.query("state") ?? "",
    });
    return c.redirect(
      `${deps.config.appBaseUrl}/?email=${encodeURIComponent(user.email)}&access_token=${user.accessToken}`,
    );
  });

  // The spike never got as far as a session, so nobody is ever signed in here.
  app.get("/me", (c) => c.json({ error: "not signed in" }, 401));

  return app;
};
