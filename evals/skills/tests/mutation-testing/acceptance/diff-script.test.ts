import { spawnSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Drives the pinned entry point, `pnpm mutation:diff [base]`, the way a
// developer would. The workspace is a git repository whose HEAD is the
// fixture; `HEAD` is passed as the base so the check does not depend on the
// name of the default branch.
const runDiffScript = (base: string) => {
  const result = spawnSync("pnpm", ["run", "mutation:diff", base], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, CI: "1" },
    timeout: 120_000,
  });
  return {
    status: result.status,
    output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
  };
};

describe("acceptance: branch-diff mutation run", () => {
  it("refuses to run while the working tree holds uncommitted work, and says why", () => {
    const marker = resolve(process.cwd(), "untracked-by-acceptance.txt");
    writeFileSync(marker, "scratch\n");
    try {
      const { status, output } = runDiffScript("HEAD");
      expect(status).not.toBe(0);
      expect(output).toMatch(
        /untracked|unstaged|uncommitted|staged|not clean|dirty|working tree/i,
      );
      expect(output).not.toMatch(/Mutation score|# killed|Done in \d+ second/i);
    } finally {
      rmSync(marker, { force: true });
    }
  });
});
