import { describe, expect, it } from "vitest";
import { formatPence } from "./money";

describe("formatting pence as pounds", () => {
  it("shows whole pounds with two decimal places", () => {
    expect(formatPence(1999)).toBe("£19.99");
  });

  it("pads pence under ten", () => {
    expect(formatPence(1005)).toBe("£10.05");
  });

  it("separates thousands", () => {
    expect(formatPence(123456789)).toBe("£1,234,567.89");
  });

  it("puts the sign before the currency symbol", () => {
    expect(formatPence(-250)).toBe("-£2.50");
  });

  it("formats zero", () => {
    expect(formatPence(0)).toBe("£0.00");
  });
});
