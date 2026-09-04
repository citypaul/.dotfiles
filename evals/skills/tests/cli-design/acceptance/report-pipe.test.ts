// Hidden acceptance test: `report` is safe to pipe.
//
// Copied into the workspace as src/acceptance-report-pipe.test.ts at grade
// time. It spawns the CLI the way a script would (both streams piped, no
// TTY) and reads stdout, stderr and the exit status separately. It pins only
// what the request pinned: the `report` command, `--json`, and the four
// fields per project. Where those entries sit inside the JSON document, how
// the human output is laid out, and what goes on stderr are the agent's call.
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ANSI = new RegExp("\\u001b\\[[0-9;]*[A-Za-z]");
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

// The envelope shape is the agent's; find the per-project entries wherever
// they were put.
const projectEntries = (
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
        entries.every((entry) => "project" in entry)
      ) {
        return entries;
      }
      queue.push(...current);
      continue;
    }
    if (isRecord(current)) queue.push(...Object.values(current));
  }
  throw new Error(
    `no per-project entries in the JSON output: ${JSON.stringify(document)}`,
  );
};

const numeric = (value: unknown): number =>
  Number(String(value).replace("%", "").trim());

const summarise = (
  entries: ReadonlyArray<Record<string, unknown>>,
): Record<string, ReadonlyArray<number>> =>
  Object.fromEntries(
    entries.map((entry) => [
      String(entry["project"]),
      [
        numeric(entry["builds"]),
        numeric(entry["failed"]),
        numeric(entry["passRate"]),
      ],
    ]),
  );

describe("acceptance: the report is safe to pipe", () => {
  it("puts one JSON document and nothing else on stdout", () => {
    const result = runCli(["report", "--json"]);

    expect(result.code).toBe(0);
    expect(result.stdout).not.toMatch(ANSI);
    expect(summarise(projectEntries(JSON.parse(result.stdout)))).toEqual({
      billing: [2, 0, 100],
      checkout: [4, 1, 75],
      search: [2, 1, 50],
    });
  });

  it("keeps status messages out of the piped human output", () => {
    const result = runCli(["report"]);

    expect(result.code).toBe(0);
    expect(result.stdout).not.toMatch(ANSI);
    const lines = result.stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "");
    expect(
      lines.filter((line) =>
        /scanning|loading|processing|working|^done\b|✓|✔/i.test(line),
      ),
    ).toEqual([]);
    expect(lines.find((line) => line.includes("checkout"))).toMatch(/75/);
    expect(lines.find((line) => line.includes("search"))).toMatch(/50/);
  });
});
