import type { OpenIdProviderClient } from "./lib/openid-provider";

export type AuthConfig = {
  readonly redirectUri: string;
  readonly appBaseUrl: string;
};

export type SignedInUser = {
  readonly email: string;
  readonly accessToken: string;
};

export type CallbackQuery = {
  readonly code: string;
  readonly state: string;
};

// Hack-day spike. It gets a person to the provider and back; nobody has looked
// at it since.
const started = new Set<string>();

export const buildSignInUrl = (provider: OpenIdProviderClient, config: AuthConfig): string => {
  const url = new URL(provider.metadata.authorizationEndpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", provider.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", "sign-in");
  started.add("sign-in");
  return url.toString();
};

export const finishSignIn = async (
  provider: OpenIdProviderClient,
  config: AuthConfig,
  query: CallbackQuery,
): Promise<SignedInUser> => {
  if (!started.has(query.state)) throw new Error("unexpected state");
  const tokens = await provider.exchangeCode({
    code: query.code,
    redirectUri: config.redirectUri,
  });
  console.log(`[auth] exchanged ${query.code} for access token ${tokens.accessToken}`);
  const claims = await provider.verifyIdTokenSignature(tokens.idToken);
  return { email: String(claims.email ?? ""), accessToken: tokens.accessToken };
};
