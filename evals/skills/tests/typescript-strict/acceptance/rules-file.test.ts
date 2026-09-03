import { describe, expect, it } from "vitest";
import { assigneeFor, loadRules } from "./rules";

const file = JSON.stringify([
  { priority: "high", assignTo: "agent-7", withinMinutes: 30 },
  { priority: "normal", assignTo: "agent-2", withinMinutes: 240 },
  { priority: "high", assignTo: "agent-9", withinMinutes: 60 },
]);

describe("acceptance: escalation rules file", () => {
  it("returns the rules as they are in the file", () => {
    expect(loadRules(file)).toEqual([
      { priority: "high", assignTo: "agent-7", withinMinutes: 30 },
      { priority: "normal", assignTo: "agent-2", withinMinutes: 240 },
      { priority: "high", assignTo: "agent-9", withinMinutes: 60 },
    ]);
  });

  it("picks the first rule for a priority", () => {
    const rules = loadRules(file);
    expect(assigneeFor(rules, "high")).toBe("agent-7");
    expect(assigneeFor(rules, "normal")).toBe("agent-2");
    expect(assigneeFor(rules, "low")).toBeUndefined();
  });

  it.each([
    ["text that is not JSON", "priority: high"],
    ["an object instead of a list", JSON.stringify({ rules: [] })],
    ["a rule missing fields", JSON.stringify([{ priority: "high" }])],
    ["a priority we do not have", JSON.stringify([{ priority: "urgent", assignTo: "agent-1", withinMinutes: 5 }])],
    ["minutes as text", JSON.stringify([{ priority: "high", assignTo: "agent-1", withinMinutes: "5" }])],
  ])("throws a readable error for %s", (_label, text) => {
    expect(() => loadRules(text)).toThrow(Error);
    expect(() => loadRules(text)).toThrow(/\S/);
  });
});
