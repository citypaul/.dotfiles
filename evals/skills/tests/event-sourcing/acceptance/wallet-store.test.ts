import { describe, expect, it } from "vitest";
import { createWalletStore, handleWalletCommand } from "./wallet";

// Built only through the names the request pins: createWalletStore() and
// handleWalletCommand({ store, walletId, command }). Nothing here knows the
// store's own interface, the event names, or how state is rebuilt.

type Result = {
  readonly success: boolean;
  readonly events?: readonly unknown[];
  readonly reason?: string;
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

const open = { type: "Open", currency: "GBP" };
const topUp = (amountPence: number) => ({ type: "TopUp", amountPence });
const charge = (amountPence: number) => ({ type: "Charge", amountPence });

const openWalletWorth = async (amountPence: number) => {
  const wallet = store();
  await send(wallet, "w1", open);
  await send(wallet, "w1", topUp(amountPence));
  return wallet;
};

describe("acceptance: keeping the wallet history", () => {
  it("records top-ups and charges against a wallet", async () => {
    const wallet = await openWalletWorth(1_000);

    const charged = await send(wallet, "w1", charge(400));

    expect(charged.success).toBe(true);
    expect(charged.events?.length).toBeGreaterThanOrEqual(1);
    // Exactly 600 left: this one goes through, one penny more does not.
    expect(await send(wallet, "w1", charge(601))).toMatchObject({
      success: false,
      reason: "insufficient-funds",
    });
    expect(await send(wallet, "w1", charge(600))).toMatchObject({
      success: true,
    });
  });

  it("keeps each wallet's history to itself", async () => {
    const wallet = await openWalletWorth(1_000);
    await send(wallet, "w2", open);
    await send(wallet, "w2", topUp(50));

    expect(await send(wallet, "w2", charge(51))).toMatchObject({
      success: false,
      reason: "insufficient-funds",
    });
    expect(await send(wallet, "w1", charge(1_000))).toMatchObject({
      success: true,
    });
  });

  it("refuses a command for a wallet that was never opened", async () => {
    const wallet = store();

    expect(await send(wallet, "nobody", topUp(500))).toMatchObject({
      success: false,
      reason: "not-open",
    });
  });

  it("never lets two charges racing for the same wallet both go through", async () => {
    const wallet = await openWalletWorth(1_000);

    const outcomes = await Promise.all([
      send(wallet, "w1", charge(600)),
      send(wallet, "w1", charge(600)),
    ]);

    expect(outcomes.filter((outcome) => outcome.success)).toHaveLength(1);
    const refused = outcomes.find((outcome) => !outcome.success);
    // The loser is told why in the caller's own words — it lost the race, or
    // the handler reloaded, re-decided and found the money gone. Both are
    // honest answers, so this only asks that a reason is given.
    expect(typeof refused?.reason).toBe("string");
    expect(refused?.reason).not.toBe("");
    // 400 pence must be left: exactly one charge of 600 was applied.
    expect(await send(wallet, "w1", charge(401))).toMatchObject({
      success: false,
      reason: "insufficient-funds",
    });
    expect(await send(wallet, "w1", charge(400))).toMatchObject({
      success: true,
    });
  });

  it("keeps the wallet whole when many charges arrive at once", async () => {
    const wallet = await openWalletWorth(1_000);

    const outcomes = await Promise.all(
      Array.from({ length: 5 }, () => send(wallet, "w1", charge(300))),
    );

    const applied = outcomes.filter((outcome) => outcome.success).length;
    expect(applied).toBeGreaterThanOrEqual(1);
    expect(applied).toBeLessThanOrEqual(3);
    const left = 1_000 - applied * 300;
    expect(await send(wallet, "w1", charge(left + 1))).toMatchObject({
      success: false,
      reason: "insufficient-funds",
    });
  });
});
