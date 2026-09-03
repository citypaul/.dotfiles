import { describe, expect, it } from "vitest";
import { formatPence, parsePounds } from "./money";

describe("formatPence", () => {
  it("shows pounds and two-digit pence", () => {
    expect(formatPence(1999)).toBe("£19.99");
    expect(formatPence(5)).toBe("£0.05");
    expect(formatPence(0)).toBe("£0.00");
  });

  it("puts the sign before the pound symbol", () => {
    expect(formatPence(-250)).toBe("-£2.50");
  });
});

describe("parsePounds", () => {
  it("reads pounds with or without the symbol and pence", () => {
    expect(parsePounds("£19.99")).toBe(1999);
    expect(parsePounds("19.99")).toBe(1999);
    expect(parsePounds(" £7 ")).toBe(700);
  });

  it("rejects anything else", () => {
    expect(parsePounds("19.9")).toBeUndefined();
    expect(parsePounds("-£1.00")).toBeUndefined();
    expect(parsePounds("ten pounds")).toBeUndefined();
  });
});
