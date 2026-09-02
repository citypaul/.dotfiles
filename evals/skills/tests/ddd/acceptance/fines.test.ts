import { describe, expect, it } from "vitest";
import * as lending from "./lending";
import { fineFor, openLoan, returnItem } from "./lending";

type Outcome = {
  readonly success: boolean;
  readonly value?: unknown;
  readonly reason?: string;
} & Record<string, unknown>;

const day = (iso: string) => new Date(iso);

// Ids go through the branded factories when the code has them (a rule graded
// separately); otherwise the raw string is used so behaviour is still measured.
const factories = lending as Record<string, unknown>;
const idVia = (name: string, raw: string) => {
  const factory = factories[name];
  return typeof factory === "function" ? (factory as (raw: string) => never)(raw) : (raw as never);
};

// A success may carry `{ loan, fine, events }` under `value` or at the top
// level, or the loan itself.
const valueOf = (result: Outcome): Record<string, unknown> => {
  if (!result.success)
    throw new Error(`expected success, got ${result.reason}`);
  return (result.value ?? result) as Record<string, unknown>;
};
const loanOf = (result: Outcome) => {
  const value = valueOf(result);
  return (value.loan ?? value) as Parameters<typeof fineFor>[0]["loan"];
};

const openedOnFirstOfMarch = () =>
  loanOf(
    openLoan({
      loanId: idVia("createLoanId", "l1"),
      patronId: idVia("createPatronId", "p1"),
      itemId: idVia("createItemId", "i1"),
      patronOpenLoans: 0,
      itemOnLoan: false,
      openedOn: day("2026-03-01"),
    }) as Outcome,
  );

describe("acceptance: Fines for late returns", () => {
  it("is nothing when returned on or before the due date", () => {
    expect(
      fineFor({ loan: openedOnFirstOfMarch(), returnedOn: day("2026-03-22") }),
    ).toEqual({ pence: 0 });
    expect(
      fineFor({ loan: openedOnFirstOfMarch(), returnedOn: day("2026-03-10") }),
    ).toEqual({ pence: 0 });
  });

  it("charges 20 pence per day late", () => {
    expect(
      fineFor({ loan: openedOnFirstOfMarch(), returnedOn: day("2026-03-25") }),
    ).toEqual({ pence: 60 });
  });

  it("caps at five pounds", () => {
    expect(
      fineFor({ loan: openedOnFirstOfMarch(), returnedOn: day("2026-06-01") }),
    ).toEqual({ pence: 500 });
  });

  it("reports the Fine when the Item is returned", () => {
    const result = returnItem({
      loan: openedOnFirstOfMarch(),
      returnedOn: day("2026-03-25"),
    }) as Outcome;
    expect(result.success).toBe(true);
    const value = valueOf(result) as {
      fine?: unknown;
      loan?: { status?: string };
      status?: string;
    };
    expect(value.fine).toEqual({ pence: 60 });
    expect((value.loan ?? value).status).toBe("returned");
  });
});
