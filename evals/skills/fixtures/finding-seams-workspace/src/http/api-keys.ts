import { expiringKeysReport } from "../expiry-report";
import { issueApiKey } from "../issue-key";
import { revokeApiKey } from "../revoke-key";

export type HttpResponse = { readonly status: number; readonly body?: unknown };

const field = (body: unknown, name: string): string | undefined => {
  if (typeof body !== "object" || body === null) return undefined;
  const value = (body as Record<string, unknown>)[name];
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
};

export const handleCreateApiKey = async (body: unknown): Promise<HttpResponse> => {
  const accountId = field(body, "accountId");
  const label = field(body, "label");
  if (accountId === undefined || label === undefined) return { status: 400, body: { error: "accountId and label required" } };
  const result = await issueApiKey(accountId, label);
  if (!result.ok) return { status: 409, body: { error: result.reason } };
  return { status: 201, body: result.key };
};

export const handleRevokeApiKey = async (params: { readonly accountId: string; readonly keyId: string }): Promise<HttpResponse> => {
  const keyId = Number(params.keyId);
  if (!Number.isInteger(keyId)) return { status: 400, body: { error: "keyId must be an integer" } };
  const outcome = await revokeApiKey(params.accountId, keyId);
  if (outcome === "not-found") return { status: 404 };
  if (outcome === "already-revoked") return { status: 409, body: { error: outcome } };
  return { status: 204 };
};

export const handleExpiringKeys = async (params: { readonly accountId: string }): Promise<HttpResponse> => ({
  status: 200,
  body: { warnings: await expiringKeysReport(params.accountId) },
});
