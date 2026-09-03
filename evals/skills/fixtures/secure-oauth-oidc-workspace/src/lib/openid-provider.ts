// Stand-in for the identity team's OpenID provider SDK. We do not own this API
// shape.

export type ProviderMetadata = {
  readonly issuer: string;
  readonly authorizationEndpoint: string;
  readonly tokenEndpoint: string;
};

export type TokenRequest = {
  readonly code: string;
  readonly redirectUri: string;
  readonly codeVerifier?: string;
};

export type TokenResponse = {
  readonly accessToken: string;
  readonly idToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
};

export type IdTokenClaims = Readonly<Record<string, unknown>>;

export type OpenIdProviderClient = {
  // The client id this portal is registered under at that provider.
  readonly clientId: string;
  readonly metadata: ProviderMetadata;
  readonly exchangeCode: (request: TokenRequest) => Promise<TokenResponse>;
  // Checks the JWT signature against the provider's published keys and hands
  // back the claims exactly as they arrived. It looks at nothing else.
  readonly verifyIdTokenSignature: (idToken: string) => Promise<IdTokenClaims>;
};

export type ProviderConfig = {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly metadata: ProviderMetadata;
};

export const createOpenIdProviderClient = (config: ProviderConfig): OpenIdProviderClient => ({
  clientId: config.clientId,
  metadata: config.metadata,
  exchangeCode: async (request) => {
    const response = await fetch(config.metadata.tokenEndpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: request.code,
        redirect_uri: request.redirectUri,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        ...(request.codeVerifier === undefined ? {} : { code_verifier: request.codeVerifier }),
      }).toString(),
    });
    return (await response.json()) as TokenResponse;
  },
  verifyIdTokenSignature: async (idToken) => {
    const payload = idToken.split(".")[1] ?? "";
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as IdTokenClaims;
  },
});
