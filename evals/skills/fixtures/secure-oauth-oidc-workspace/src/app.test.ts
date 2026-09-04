import { describe, expect, it } from "vitest";
import { createApp } from "./index";
import type { OpenIdProviderClient } from "./lib/openid-provider";

const provider: OpenIdProviderClient = {
  clientId: "portal-web",
  metadata: {
    issuer: "https://id.example.com",
    authorizationEndpoint: "https://id.example.com/authorize",
    tokenEndpoint: "https://id.example.com/token",
  },
  exchangeCode: async () => ({
    accessToken: "access-token",
    idToken: "id-token",
    refreshToken: "refresh-token",
    expiresIn: 3600,
  }),
  verifyIdTokenSignature: async () => ({ email: "ada@example.com" }),
};

const config = {
  redirectUri: "https://portal.example.com/auth/callback",
  appBaseUrl: "https://portal.example.com",
};

const portal = () => createApp({ provider, config });

describe("the portal", () => {
  it("is up", async () => {
    const response = await portal().request("/health");

    expect(response.status).toBe(200);
  });

  it("sends a visitor to the identity provider to sign in", async () => {
    const response = await portal().request("/auth/login");
    const url = new URL(response.headers.get("location") ?? "");

    expect([302, 303]).toContain(response.status);
    expect(`${url.origin}${url.pathname}`).toBe("https://id.example.com/authorize");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBe("portal-web");
  });

  it("does not treat an unknown visitor as signed in", async () => {
    const response = await portal().request("/me");

    expect(response.status).toBe(401);
  });
});
