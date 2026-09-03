// Hidden acceptance test for the review case. The request asks for a review,
// not a change, so this is a regression guard: it passes on the untouched
// fixture and fails only if the portal's observable behaviour was broken.
import { describe, expect, it } from "vitest";
import { createApp } from "./index";

const provider = {
  clientId: "portal-web",
  metadata: {
    issuer: "https://id.example.com",
    authorizationEndpoint: "https://id.example.com/authorize",
    tokenEndpoint: "https://id.example.com/token",
  },
  exchangeCode: async () => ({
    accessToken: "AT-9f3",
    idToken: "id-token",
    refreshToken: "RT-4c1",
    expiresIn: 3600,
  }),
  verifyIdTokenSignature: async () => ({ email: "ada@example.com" }),
};

const config = {
  redirectUri: "https://portal.example.com/auth/callback",
  appBaseUrl: "https://portal.example.com",
};

const portal = () => createApp({ provider, config });

describe("acceptance: the portal still works", () => {
  it("is up", async () => {
    expect((await portal().request("/health")).status).toBe(200);
  });

  it("still sends a visitor to the identity provider", async () => {
    const response = await portal().request("/auth/login");
    const url = new URL(response.headers.get("location") ?? "about:blank");

    expect([302, 303]).toContain(response.status);
    expect(`${url.origin}${url.pathname}`).toBe("https://id.example.com/authorize");
  });

  it("does not treat an unknown visitor as signed in", async () => {
    expect((await portal().request("/me")).status).toBe(401);
  });
});
