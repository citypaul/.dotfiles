import { describe, expect, it } from "vitest";
import { parseBuilds } from "./builds";

describe("parseBuilds", () => {
  it("reads the recorded builds", () => {
    const builds = parseBuilds(
      '[{"id":"b1","project":"checkout","status":"passed","duration_ms":41000}]',
    );

    expect(builds).toEqual([
      { id: "b1", project: "checkout", status: "passed", durationMs: 41000 },
    ]);
  });

  it("refuses a file that is not a list of builds", () => {
    expect(() => parseBuilds('{"builds":[]}')).toThrow();
  });
});
