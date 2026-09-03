// Hidden acceptance test: a CI script can tell the failures apart.
//
// Copied into the workspace as src/acceptance-exit-codes.test.ts at grade
// time. It spawns the CLI with both streams piped and reads stdout, stderr
// and the exit status separately. It pins only what the request pinned:
// `report`, `--fail-under`, `--json` and the `--config` flag the fixture
// already has. Which number stands for which kind of failure is the agent's
// call to get right.
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

type CliResult = {
  readonly stdout: string;
  readonly stderr: string;
  readonly code: number;
};

const runCli = (args: ReadonlyArray<string>): CliResult => {
  const result = spawnSync(
    resolve(root, "node_modules/.bin/tsx"),
    [resolve(root, "src/cli.ts"), ...args],
    { cwd: root, encoding: "utf8", timeout: 60_000 },
  );
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    code: result.status ?? -1,
  };
};

describe("acceptance: failures a script can branch on", () => {
  it("succeeds when the pass rate clears the gate", () => {
    const result = runCli(["report", "--fail-under", "50"]);

    expect(result.code).toBe(0);
  });

  it("fails the gate with its own code and says why on stderr", () => {
    const result = runCli(["report", "--fail-under", "90"]);

    expect(result.code).toBe(1);
    expect(result.stderr.trim()).not.toBe("");
  });

  it("rejects a flag it does not understand without printing to stdout", () => {
    const result = runCli(["report", "--not-a-real-flag"]);

    expect(result.code).toBe(2);
    expect(result.stderr.trim()).not.toBe("");
    expect(result.stdout.trim()).toBe("");
  });

  it("separates a missing config file from every other failure", () => {
    const result = runCli(["report", "--config", "./no-such-config.json"]);

    expect(result.code).toBe(78);
    expect(result.stderr.trim()).not.toBe("");
    expect(result.stdout.trim()).toBe("");
  });

  it("leaves stdout empty when a machine-readable run fails", () => {
    const result = runCli(["report", "--json", "--fail-under", "90"]);

    expect(result.code).toBe(1);
    expect(result.stdout.trim()).toBe("");
    expect(result.stderr.trim()).not.toBe("");
  });
});
