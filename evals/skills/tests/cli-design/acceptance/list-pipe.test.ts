// Hidden acceptance test: `list` behaves when a script wraps it.
//
// Copied into the workspace as src/acceptance-list-pipe.test.ts at grade
// time. Both streams are pipes and neither is a TTY, which is exactly the
// case the request complains about. It pins only `list`, `--json` and the
// `--config` flag the fixture already has; the layout of the human output
// and the shape of the JSON document are the agent's call.
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ANSI = new RegExp("\\u001b\\[[0-9;]*[A-Za-z]");
const root = process.cwd();
const BUILD_IDS = ["b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8"];

type CliResult = {
  readonly stdout: string;
  readonly stderr: string;
  readonly code: number;
};

const runCli = (
  args: ReadonlyArray<string>,
  env: Readonly<Record<string, string>> = {},
): CliResult => {
  const result = spawnSync(
    resolve(root, "node_modules/.bin/tsx"),
    [resolve(root, "src/cli.ts"), ...args],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 60_000,
      env: { ...process.env, ...env },
    },
  );
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    code: result.status ?? -1,
  };
};

const lines = (text: string): ReadonlyArray<string> =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

// The envelope shape is the agent's; find the build entries wherever they
// were put.
const buildEntries = (
  document: unknown,
): ReadonlyArray<Record<string, unknown>> => {
  const queue: unknown[] = [document];
  while (queue.length > 0) {
    const current = queue.shift();
    if (Array.isArray(current)) {
      const entries = current.filter(isRecord);
      if (
        entries.length === current.length &&
        entries.length > 0 &&
        entries.every((entry) => "id" in entry)
      ) {
        return entries;
      }
      queue.push(...current);
      continue;
    }
    if (isRecord(current)) queue.push(...Object.values(current));
  }
  throw new Error(
    `no build entries in the JSON output: ${JSON.stringify(document)}`,
  );
};

describe("acceptance: list survives a pipe", () => {
  it("puts every build and nothing else on stdout", () => {
    const result = runCli(["list"]);

    expect(result.code).toBe(0);
    expect(result.stdout).not.toMatch(ANSI);
    const printed = lines(result.stdout);
    expect(
      printed.filter((line) => BUILD_IDS.some((id) => line.includes(id))),
    ).toHaveLength(8);
    expect(
      printed.filter((line) =>
        /scanning|loading|processing|working|^done\b|✓|✔/i.test(line),
      ),
    ).toEqual([]);
  });

  it("emits no terminal control sequences when nothing is a terminal", () => {
    const result = runCli(["list"]);

    expect(result.stderr).not.toMatch(ANSI);
  });

  it("gives a script the builds as data", () => {
    const result = runCli(["list", "--json"]);

    expect(result.code).toBe(0);
    expect(result.stdout).not.toMatch(ANSI);
    const entries = buildEntries(JSON.parse(result.stdout));
    expect(entries.map((entry) => String(entry["id"])).sort()).toEqual(
      BUILD_IDS,
    );
  });

  it("keeps a failure out of the data a script is reading", () => {
    const result = runCli(["list", "--config", "./no-such-config.json"]);

    expect(result.code).not.toBe(0);
    expect(result.stdout.trim()).toBe("");
    expect(result.stderr.trim()).not.toBe("");
  });
});
