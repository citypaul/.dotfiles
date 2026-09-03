import { describe, expect, it } from "vitest";
import { describeCount } from "./tasks";

describe("describeCount", () => {
  it("names the total when nothing is filtered out", () => {
    expect(describeCount(5, 5)).toBe("5 tasks");
  });

  it("uses the singular for a single task", () => {
    expect(describeCount(1, 1)).toBe("1 task");
  });

  it("names both numbers when a filter is on", () => {
    expect(describeCount(2, 5)).toBe("2 of 5 tasks");
  });
});
