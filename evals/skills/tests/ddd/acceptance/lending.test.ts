import { describe, expect, it } from "vitest";
import * as lending from "./lending";
import { openLoan, renewLoan, returnItem } from "./lending";

type Loan = {
  readonly status: string;
  readonly patronId: string;
  readonly itemId: string;
  readonly dueOn: Date;
  readonly renewals: number;
};
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

// Day arithmetic may run in UTC or local time (a 21-day window crosses a clock
// change); a due date matches when either reading of it lands on the day.
const onDay = (actual: Date, iso: string) => {
  const utc = actual.toISOString().slice(0, 10);
  const local = `${actual.getFullYear()}-${String(actual.getMonth() + 1).padStart(2, "0")}-${String(actual.getDate()).padStart(2, "0")}`;
  return utc === iso || local === iso;
};

// The glossary fixes `{ success, reason }` for refusals. A success may carry
// `{ loan, events }` under `value` or at the top level, or the loan itself.
const valueOf = (result: Outcome): Record<string, unknown> => {
  if (!result.success)
    throw new Error(`expected success, got ${result.reason}`);
  return (result.value ?? result) as Record<string, unknown>;
};
const loanOf = (result: Outcome): Loan => {
  const value = valueOf(result);
  return (value.loan ?? value) as Loan;
};
const eventsOf = (result: Outcome) => valueOf(result).events;

const open = (overrides: Partial<Parameters<typeof openLoan>[0]> = {}) =>
  openLoan({
    loanId: idVia("createLoanId", "l1"),
    patronId: idVia("createPatronId", "p1"),
    itemId: idVia("createItemId", "i1"),
    patronOpenLoans: 0,
    itemOnLoan: false,
    openedOn: day("2026-03-01"),
    ...overrides,
  }) as Outcome;

describe("acceptance: Loans", () => {
  it("opens a Loan due after the loan period and raises LoanOpened", () => {
    const result = open();
    const loan = loanOf(result);
    expect(loan.status).toBe("open");
    expect(loan.patronId).toBe("p1");
    expect(loan.itemId).toBe("i1");
    expect(onDay(loan.dueOn, "2026-03-22")).toBe(true);
    expect(loan.renewals).toBe(0);
    expect(eventsOf(result)).toEqual([
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
    const first = loanOf(
      renewLoan({
        loan: loanOf(open()),
        holdsOnItem: 0,
        renewedOn: day("2026-03-20"),
      }) as Outcome,
    );
    expect(onDay(first.dueOn, "2026-04-12")).toBe(true);
    expect(first.renewals).toBe(1);
    const second = loanOf(
      renewLoan({
        loan: first,
        holdsOnItem: 0,
        renewedOn: day("2026-04-10"),
      }) as Outcome,
    );
    expect(onDay(second.dueOn, "2026-05-03")).toBe(true);
    expect(
      renewLoan({ loan: second, holdsOnItem: 0, renewedOn: day("2026-05-01") }),
    ).toEqual({
      success: false,
      reason: "renewal-limit-reached",
    });
  });

  it("refuses a renewal while a Hold exists", () => {
    expect(
      renewLoan({
        loan: loanOf(open()),
        holdsOnItem: 1,
        renewedOn: day("2026-03-20"),
      }),
    ).toEqual({
      success: false,
      reason: "hold-exists",
    });
  });

  it("returns the Item, closes the Loan and raises ItemReturned", () => {
    const result = returnItem({
      loan: loanOf(open()),
      returnedOn: day("2026-03-10"),
    }) as Outcome;
    expect(loanOf(result).status).toBe("returned");
    expect(eventsOf(result)).toEqual([
      {
        type: "ItemReturned",
        loanId: "l1",
        itemId: "i1",
        returnedOn: day("2026-03-10"),
      },
    ]);
  });

  it("refuses to renew or return a Loan that is not open", () => {
    const closed = loanOf(
      returnItem({
        loan: loanOf(open()),
        returnedOn: day("2026-03-10"),
      }) as Outcome,
    );
    expect(
      renewLoan({ loan: closed, holdsOnItem: 0, renewedOn: day("2026-03-11") }),
    ).toEqual({ success: false, reason: "loan-not-open" });
    expect(returnItem({ loan: closed, returnedOn: day("2026-03-11") })).toEqual(
      { success: false, reason: "loan-not-open" },
    );
  });

  it("does not mutate the Loan it was given", () => {
    const original = loanOf(open());
    renewLoan({ loan: original, holdsOnItem: 0, renewedOn: day("2026-03-20") });
    returnItem({ loan: original, returnedOn: day("2026-03-10") });
    expect(original.renewals).toBe(0);
    expect(original.status).toBe("open");
  });
});
