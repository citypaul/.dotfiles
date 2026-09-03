import { describe, expect, it } from "vitest";
import { lateFee } from "./late-fee";

// Pins what src/late-fee.ts charges today, quirks included. Tonight's run
// depends on these numbers; the task was to make the function safe to change.
describe("acceptance: lateFee still charges as deployed", () => {
  it("charges nothing inside the grace period, including its last day", () => {
    expect(lateFee(10000, 0)).toBe(0);
    expect(lateFee(10000, 3)).toBe(0);
  });

  it("charges every overdue day once past the grace period", () => {
    expect(lateFee(10000, 4)).toBe(800);
    expect(lateFee(12345, 7)).toBe(1728);
  });

  it("rounds a half-penny fee up", () => {
    expect(lateFee(12345, 5)).toBe(1235);
  });

  it("charges each tier at its own rate", () => {
    expect(lateFee(10000, 4, "standard")).toBe(800);
    expect(lateFee(10000, 4, "plus")).toBe(400);
    expect(lateFee(10000, 4, "enterprise")).toBe(0);
  });

  it("charges an unknown or empty tier at the standard rate", () => {
    expect(lateFee(10000, 4, "gold")).toBe(800);
    expect(lateFee(10000, 4, "")).toBe(800);
  });

  it("caps the fee at fifty pounds", () => {
    expect(lateFee(100000, 10)).toBe(5000);
    expect(lateFee(100000, 10, "plus")).toBe(5000);
  });
});
