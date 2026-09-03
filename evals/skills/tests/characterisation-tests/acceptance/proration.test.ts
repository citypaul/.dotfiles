import { describe, expect, it } from "vitest";
import { proratedCharge } from "./proration";

// Pins what src/proration.ts does today, quirks included. The task was to make
// the function safe to change, not to change it: the nightly billing run
// depends on every one of these values.
describe("acceptance: proratedCharge still behaves as deployed", () => {
  it("charges the full month when there is no cancellation", () => {
    expect(proratedCharge(3100, "2026-03-01", "2026-03-31")).toBe(3100);
  });

  it("counts the cancellation day as a used day", () => {
    expect(proratedCharge(3100, "2026-03-01", "2026-03-31", "2026-03-10")).toBe(
      1000,
    );
    expect(proratedCharge(3100, "2026-03-01", "2026-03-31", "2026-03-01")).toBe(
      100,
    );
  });

  it("charges the full month when cancelled on or after the period end", () => {
    expect(proratedCharge(3100, "2026-03-01", "2026-03-31", "2026-03-31")).toBe(
      3100,
    );
    expect(proratedCharge(3100, "2026-03-01", "2026-03-31", "2026-04-01")).toBe(
      3100,
    );
  });

  it("still charges the full month when cancelled before the period starts", () => {
    expect(proratedCharge(3100, "2026-03-01", "2026-03-31", "2026-02-28")).toBe(
      3100,
    );
  });

  it("rounds a fractional charge down, even from .5 and above", () => {
    expect(proratedCharge(1000, "2026-02-01", "2026-02-28", "2026-02-10")).toBe(
      357,
    );
    expect(proratedCharge(1000, "2026-02-01", "2026-02-28", "2026-02-15")).toBe(
      535,
    );
  });
});
