import { describe, expect, it } from "vitest";
import { createWalletStore, handleWalletCommand, walletScreen } from "./wallet";

// Built only through the names the request pins. Where the screen's numbers
// come from is the agent's design; this only checks that they are right, that
// they keep up with the write side, and that each wallet's screen is its own.

type Result = { readonly success: boolean; readonly reason?: string };
type Screen = {
  readonly currency?: string;
  readonly balancePence?: number;
  readonly statement?: ReadonlyArray<Record<string, unknown>>;
};

const store = () => (createWalletStore as unknown as () => unknown)();

const send = async (
  wallet: unknown,
  walletId: string,
  command: unknown,
): Promise<Result> =>
  (await (
    handleWalletCommand as unknown as (input: {
      store: unknown;
      walletId: string;
      command: unknown;
    }) => Promise<Result> | Result
  )({ store: wallet, walletId, command })) as Result;

const screenOf = async (wallet: unknown, walletId: string): Promise<Screen> =>
  (await (
    walletScreen as unknown as (input: {
      store: unknown;
      walletId: string;
    }) => Promise<Screen> | Screen
  )({ store: wallet, walletId })) as Screen;

const open = { type: "Open", currency: "GBP" };
const topUp = (amountPence: number) => ({ type: "TopUp", amountPence });
const charge = (amountPence: number) => ({ type: "Charge", amountPence });

describe("acceptance: the wallet screen", () => {
  it("shows a freshly opened wallet as empty", async () => {
    const wallet = store();
    await send(wallet, "w1", open);

    const screen = await screenOf(wallet, "w1");

    expect(screen.currency).toBe("GBP");
    expect(screen.balancePence).toBe(0);
    expect(screen.statement).toEqual([]);
  });

  it("shows one line per top-up and charge, oldest first, with the balance after each", async () => {
    const wallet = store();
    await send(wallet, "w1", open);
    await send(wallet, "w1", topUp(1_000));
    await send(wallet, "w1", charge(400));
    await send(wallet, "w1", topUp(250));

    const screen = await screenOf(wallet, "w1");

    expect(screen.balancePence).toBe(850);
    expect(screen.statement).toMatchObject([
      { amountPence: 1_000, balanceAfterPence: 1_000 },
      { amountPence: -400, balanceAfterPence: 600 },
      { amountPence: 250, balanceAfterPence: 850 },
    ]);
  });

  it("leaves a refused charge off the screen", async () => {
    const wallet = store();
    await send(wallet, "w1", open);
    await send(wallet, "w1", topUp(500));
    expect(await send(wallet, "w1", charge(900))).toMatchObject({
      success: false,
    });

    const screen = await screenOf(wallet, "w1");

    expect(screen.balancePence).toBe(500);
    expect(screen.statement).toHaveLength(1);
  });

  it("keeps one wallet's screen out of another's", async () => {
    const wallet = store();
    await send(wallet, "w1", open);
    await send(wallet, "w1", topUp(1_000));
    await send(wallet, "w2", open);
    await send(wallet, "w2", topUp(25));
    await send(wallet, "w2", charge(5));

    expect(await screenOf(wallet, "w1")).toMatchObject({ balancePence: 1_000 });
    const second = await screenOf(wallet, "w2");
    expect(second.balancePence).toBe(20);
    expect(second.statement).toMatchObject([
      { amountPence: 25, balanceAfterPence: 25 },
      { amountPence: -5, balanceAfterPence: 20 },
    ]);
  });

  it("keeps up as more happens to the wallet", async () => {
    const wallet = store();
    await send(wallet, "w1", open);
    await send(wallet, "w1", topUp(100));

    expect(await screenOf(wallet, "w1")).toMatchObject({ balancePence: 100 });

    await send(wallet, "w1", charge(60));
    const later = await screenOf(wallet, "w1");

    expect(later.balancePence).toBe(40);
    expect(later.statement).toHaveLength(2);
  });
});
