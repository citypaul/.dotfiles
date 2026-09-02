import { describe, expect, it } from "vitest";
import {
  createItemId,
  createLoanId,
  createPatronId,
  openLoan,
  renewLoan,
  returnItem,
} from "./lending";

const day = (iso: string) => new Date(iso);

const open = (overrides: Partial<Parameters<typeof openLoan>[0]> = {}) =>
  openLoan({
    loanId: createLoanId("l1"),
    patronId: createPatronId("p1"),
    itemId: createItemId("i1"),
    patronOpenLoans: 0,
    itemOnLoan: false,
    openedOn: day("2026-03-01"),
    ...overrides,
  });

const unwrap = <T>(
  result: { success: true; value: T } | { success: false; reason: string },
): T => {
  if (!result.success)
    throw new Error(`expected success, got ${result.reason}`);
  return result.value;
};

describe("acceptance: Loans", () => {
  it("opens a Loan due after the loan period and raises LoanOpened", () => {
    const { loan, events } = unwrap(open());
    expect(loan.status).toBe("open");
    expect(loan.patronId).toBe("p1");
    expect(loan.itemId).toBe("i1");
    expect(loan.dueOn).toEqual(day("2026-03-22"));
    expect(loan.renewals).toBe(0);
    expect(events).toEqual([
      { type: "LoanOpened", loanId: "l1", patronId: "p1", itemId: "i1" },
    ]);
  });

  it("refuses a Patron at the lending limit", () => {
    expect(open({ patronOpenLoans: 5 })).toEqual({
      success: false,
      reason: "lending-limit-reached",
    });
  });

  it("refuses an Item already on Loan", () => {
    expect(open({ itemOnLoan: true })).toEqual({
      success: false,
      reason: "item-on-loan",
    });
  });

  it("renews from the current due date, at most twice", () => {
    const first = unwrap(
      renewLoan({
        loan: unwrap(open()).loan,
        holdsOnItem: 0,
        renewedOn: day("2026-03-20"),
      }),
    );
    expect(first.loan.dueOn).toEqual(day("2026-04-12"));
    expect(first.loan.renewals).toBe(1);
    const second = unwrap(
      renewLoan({
        loan: first.loan,
        holdsOnItem: 0,
        renewedOn: day("2026-04-10"),
      }),
    );
    expect(second.loan.dueOn).toEqual(day("2026-05-03"));
    expect(
      renewLoan({
        loan: second.loan,
        holdsOnItem: 0,
        renewedOn: day("2026-05-01"),
      }),
    ).toEqual({ success: false, reason: "renewal-limit-reached" });
  });

  it("refuses a renewal while a Hold exists", () => {
    expect(
      renewLoan({
        loan: unwrap(open()).loan,
        holdsOnItem: 1,
        renewedOn: day("2026-03-20"),
      }),
    ).toEqual({ success: false, reason: "hold-exists" });
  });

  it("returns the Item, closes the Loan and raises ItemReturned", () => {
    const returned = unwrap(
      returnItem({ loan: unwrap(open()).loan, returnedOn: day("2026-03-10") }),
    );
    expect(returned.loan.status).toBe("returned");
    expect(returned.events).toEqual([
      {
        type: "ItemReturned",
        loanId: "l1",
        itemId: "i1",
        returnedOn: day("2026-03-10"),
      },
    ]);
  });

  it("refuses to renew or return a Loan that is not open", () => {
    const closed = unwrap(
      returnItem({ loan: unwrap(open()).loan, returnedOn: day("2026-03-10") }),
    ).loan;
    expect(
      renewLoan({ loan: closed, holdsOnItem: 0, renewedOn: day("2026-03-11") }),
    ).toEqual({ success: false, reason: "loan-not-open" });
    expect(returnItem({ loan: closed, returnedOn: day("2026-03-11") })).toEqual(
      { success: false, reason: "loan-not-open" },
    );
  });

  it("does not mutate the Loan it was given", () => {
    const original = unwrap(open()).loan;
    renewLoan({ loan: original, holdsOnItem: 0, renewedOn: day("2026-03-20") });
    returnItem({ loan: original, returnedOn: day("2026-03-10") });
    expect(original.renewals).toBe(0);
    expect(original.status).toBe("open");
  });
});
