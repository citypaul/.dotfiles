// Hidden acceptance test for the config case. Copied into the workspace as
// src/acceptance-config.test.ts at grade time, so imports are relative to src.
//
// It reads the config the agent's `createConfig(env)` returns without assuming
// how the values are named or grouped, and requires a container with a missing
// or nonsense setting to be refused with the setting named.
import { describe, expect, it } from "vitest";
import { createConfig } from "./config";

const camel = (key: string) => key.toLowerCase().replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());

const valueOf = (config: unknown, key: string): unknown => {
  const record = (config ?? {}) as Record<string, unknown>;
  const names = [key, key.toLowerCase(), camel(key)];
  const direct = names.map((name) => record[name]).find((value) => value !== undefined);
  if (direct !== undefined) return direct;
  const groups = Object.values(record).filter(
    (value): value is Record<string, unknown> => typeof value === "object" && value !== null,
  );
  return groups
    .flatMap((group) => names.map((name) => group[name]))
    .find((value) => value !== undefined);
};

// A refusal may arrive as a throw or as a returned failure; either way the
// message has to name the setting at fault.
const refusalFor = (env: Record<string, string | undefined>): string | undefined => {
  try {
    const result: unknown = createConfig(env);
    const outcome = result as { readonly success?: boolean; readonly ok?: boolean };
    return outcome?.success === false || outcome?.ok === false ? JSON.stringify(result) : undefined;
  } catch (error) {
    return error instanceof Error ? `${error.message} ${JSON.stringify(error, Object.getOwnPropertyNames(error))}` : String(error);
  }
};

const platformEnv = {
  PORT: "8080",
  DATABASE_URL: "postgres://db.internal:5432/sessions",
  SESSION_TTL_MINUTES: "30",
  LOG_LEVEL: "info",
};

describe("acceptance: configuration for a container", () => {
  it("takes its values from what the platform set", () => {
    const config = createConfig(platformEnv);

    expect(Number(valueOf(config, "PORT"))).toBe(8080);
    expect(String(valueOf(config, "DATABASE_URL"))).toBe("postgres://db.internal:5432/sessions");
    expect(Number(valueOf(config, "SESSION_TTL_MINUTES"))).toBe(30);
  });

  it("refuses a container that is missing the database setting, naming it", () => {
    const refusal = refusalFor({ PORT: "8080", SESSION_TTL_MINUTES: "30", LOG_LEVEL: "info" });

    expect(refusal).toMatch(/DATABASE_URL/i);
  });

  it("refuses a container whose port is nonsense, naming it", () => {
    const refusal = refusalFor({ ...platformEnv, PORT: "not-a-port" });

    expect(refusal).toMatch(/PORT/i);
  });
});
