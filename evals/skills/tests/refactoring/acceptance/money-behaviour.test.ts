import { describe, expect, it } from "vitest";
import { formatPence, parsePounds } from "./money";

describe("acceptance: money formatting and parsing are exactly what they were", () => {
  it("formats pounds with two-digit pence and a leading sign", () => {
    expect(formatPence(1999)).toBe("£19.99");
    expect(formatPence(5)).toBe("£0.05");
    expect(formatPence(0)).toBe("£0.00");
    expect(formatPence(100000)).toBe("£1000.00");
    expect(formatPence(-250)).toBe("-£2.50");
    expect(formatPence(-5)).toBe("-£0.05");
  });

  it("parses pounds with or without the symbol, trimming whitespace, two-digit pence only", () => {
    expect(parsePounds("£19.99")).toBe(1999);
    expect(parsePounds("19.99")).toBe(1999);
    expect(parsePounds(" £7 ")).toBe(700);
    expect(parsePounds("£0.05")).toBe(5);
    expect(parsePounds("19.9")).toBeUndefined();
    expect(parsePounds("19.999")).toBeUndefined();
    expect(parsePounds("-£1.00")).toBeUndefined();
    expect(parsePounds("£")).toBeUndefined();
    expect(parsePounds("")).toBeUndefined();
    expect(parsePounds("ten pounds")).toBeUndefined();
  });
});
