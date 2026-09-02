import { describe, expect, it } from "vitest";
import {
  createItemId,
  createLoanId,
  createPatronId,
  fineFor,
  openLoan,
  returnItem,
} from "./lending";

const day = (iso: string) => new Date(iso);

// A success may carry its payload under `value` or at the top level.
const payload = <T extends Record<string, unknown>>(result: { value?: T } & Partial<T>): T => (result.value ?? result) as T;

const openedOnFirstOfMarch = () => {
  const result = openLoan({
    loanId: createLoanId("l1"),
    patronId: createPatronId("p1"),
    itemId: createItemId("i1"),
    patronOpenLoans: 0,
    itemOnLoan: false,
    openedOn: day("2026-03-01"),
  });
  if (!result.success)
    throw new Error(`fixture loan refused: ${result.reason}`);
  return result.value.loan;
};

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
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value.fine).toEqual({ pence: 60 });
    expect(result.value.loan.status).toBe("returned");
  });
});
