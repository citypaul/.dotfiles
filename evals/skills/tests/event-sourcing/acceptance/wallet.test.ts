import { describe, expect, it } from "vitest";
import { decide, evolve, initialState } from "./wallet";

// Built only through the names the request pins: initialState,
// evolve(state, event) and decide(command, state). Nothing here assumes an
// event name, a state shape beyond `status`/`balancePence`/`currency`, or how
// the decider is organised.

type Decision = {
  readonly accepted: boolean;
  readonly events?: readonly unknown[];
  readonly reason?: string;
};

const askFor = (command: unknown, state: unknown): Decision =>
  (decide as unknown as (c: unknown, s: unknown) => Decision)(command, state);

const fold = (events: readonly unknown[], from: unknown): unknown =>
  events.reduce(
    (state, event) =>
      (evolve as unknown as (s: unknown, e: unknown) => unknown)(state, event),
    from,
  );

const view = (state: unknown) =>
  state as {
    readonly status: string;
    readonly balancePence?: number;
    readonly currency?: string;
  };

// Apply a sequence of commands, keeping every event that was accepted, so a
// test can both look at the running state and replay the whole history.
const run = (commands: readonly unknown[]) => {
  const history: unknown[] = [];
  let state: unknown = initialState;
  for (const command of commands) {
    const decision = askFor(command, state);
    if (!decision.accepted) {
      throw new Error(`expected acceptance, got ${String(decision.reason)}`);
    }
    const events = decision.events ?? [];
    history.push(...events);
    state = fold(events, state);
  }
  return { state, history };
};

const open = { type: "Open", currency: "GBP" };
const topUp = (amountPence: number) => ({ type: "TopUp", amountPence });
const charge = (amountPence: number) => ({ type: "Charge", amountPence });

describe("acceptance: wallet top-ups and charges", () => {
  it("starts unopened and opens in a currency", () => {
    expect(view(initialState).status).toBe("unopened");

    const { state } = run([open]);

    expect(view(state)).toMatchObject({
      status: "open",
      currency: "GBP",
      balancePence: 0,
    });
  });

  it("adds top-ups and takes charges off the balance", () => {
    const { state } = run([open, topUp(1_000), charge(400), topUp(250)]);

    expect(view(state)).toMatchObject({ status: "open", balancePence: 850 });
  });

  it("refuses a charge that would take the wallet below zero", () => {
    const { state } = run([open, topUp(1_000)]);

    const decision = askFor(charge(1_001), state);

    expect(decision.accepted).toBe(false);
    expect(decision.reason).toBe("insufficient-funds");
    expect(view(fold(decision.events ?? [], state)).balancePence).toBe(1_000);
  });

  it("allows a charge for exactly the balance", () => {
    const { state } = run([open, topUp(1_000), charge(1_000)]);

    expect(view(state).balancePence).toBe(0);
  });

  it("refuses a top-up or a charge before the wallet is opened", () => {
    expect(askFor(topUp(500), initialState)).toMatchObject({
      accepted: false,
      reason: "not-open",
    });
    expect(askFor(charge(500), initialState)).toMatchObject({
      accepted: false,
      reason: "not-open",
    });
  });

  it("refuses to open a wallet twice", () => {
    const { state } = run([open]);

    expect(askFor(open, state)).toMatchObject({
      accepted: false,
      reason: "already-open",
    });
  });

  it("refuses amounts that are not a whole positive number of pence", () => {
    const { state } = run([open, topUp(1_000)]);

    for (const command of [
      topUp(0),
      topUp(-100),
      topUp(10.5),
      charge(0),
      charge(-100),
      charge(10.5),
    ]) {
      expect(askFor(command, state)).toMatchObject({
        accepted: false,
        reason: "invalid-amount",
      });
    }
  });

  it("gives the same wallet when the whole history is replayed from the start", () => {
    const { state, history } = run([
      open,
      topUp(1_000),
      charge(400),
      topUp(250),
      charge(850),
      topUp(75),
    ]);

    expect(history.length).toBeGreaterThanOrEqual(6);
    expect(view(fold(history, initialState))).toEqual(view(state));
    expect(view(state).balancePence).toBe(75);
  });
});
