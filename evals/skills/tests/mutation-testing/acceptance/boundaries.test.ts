import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  describeOrder,
  discountPence,
  shippingPence,
  subtotalPence,
  totalPence,
  type LineItem,
  type Order,
} from "./checkout";

// Two claims the request makes observable. First, the pricing rules are
// right as they are, so strengthening the tests must not change them (built
// only through the public API). Second, "a change like that cannot slip
// through again": the suite the agent left behind must go red when the bug
// that shipped — and the other bugs the weak tests let through — is put back
// into src/checkout.ts. The second claim is what the pristine fixture fails:
// every mutant below survives the tests as committed.
const item = (overrides: Partial<LineItem> = {}): LineItem => ({
  sku: "sku-1",
  unitPence: 100,
  quantity: 1,
  ...overrides,
});

const gbOrder = (overrides: Partial<Order> = {}): Order => ({
  items: [item()],
  customer: { isMember: false, country: "GB" },
  promoCode: null,
  ...overrides,
});

const gbOrderOf = (pence: number): Order =>
  gbOrder({ items: [item({ unitPence: pence })] });

describe("acceptance: pricing rules hold at their boundaries", () => {
  it("multiplies unit price by quantity", () => {
    expect(subtotalPence([item({ unitPence: 250, quantity: 3 })])).toBe(750);
  });

  it("gives the bulk discount at exactly £100", () => {
    expect(discountPence(gbOrderOf(10_000))).toBe(1_000);
  });

  it("gives no bulk discount a penny under £100", () => {
    expect(discountPence(gbOrderOf(9_999))).toBe(0);
  });

  it("needs both membership and the code for the member discount", () => {
    expect(
      discountPence(
        gbOrder({
          customer: { isMember: true, country: "GB" },
          promoCode: "MEMBER5",
        }),
      ),
    ).toBe(100);
    expect(
      discountPence(
        gbOrder({
          customer: { isMember: true, country: "GB" },
          promoCode: null,
        }),
      ),
    ).toBe(0);
    expect(
      discountPence(
        gbOrder({
          customer: { isMember: false, country: "GB" },
          promoCode: "MEMBER5",
        }),
      ),
    ).toBe(0);
  });

  it("ships free from exactly £50 of goods after discount", () => {
    expect(shippingPence(gbOrderOf(5_000))).toBe(0);
    expect(shippingPence(gbOrderOf(4_999))).toBe(399);
  });

  it("totals subtotal minus discount plus shipping", () => {
    expect(totalPence(gbOrderOf(12_000))).toBe(10_800);
  });

  it("describes the order", () => {
    expect(
      describeOrder(
        gbOrder({ items: [item({ unitPence: 250, quantity: 3 })] }),
      ),
    ).toBe("3 item(s), £11.49 (plus shipping)");
  });
});

// The production file is mutated on disk, the agent's own suite is run
// against it (this acceptance file excluded), and the original is restored.
// The module imported above is already loaded, so the tests above are
// unaffected. A suite that is red before any mutation kills nothing.
const productionFile = resolve(process.cwd(), "src", "checkout.ts");

const runOwnSuite = () => {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !/^VITEST/.test(key)),
  );
  const result = spawnSync(
    "pnpm",
    ["exec", "vitest", "run", "--exclude", "**/acceptance-*.test.ts"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...env, CI: "1" },
      timeout: 120_000,
    },
  );
  return {
    status: result.status,
    output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
  };
};

const lastLine = (output: string): string =>
  output
    .split("\n")
    .map((line) => line.replace(/\u001b\[[0-9;]*m/g, "").trim())
    .filter((line) => /^Tests\s/.test(line))
    .map((line) => line.replace(/^Tests\s+/, ""))
    .at(-1) ?? "no summary";

type Mutant = {
  readonly name: string;
  readonly from: string;
  readonly to: string;
};

const mutants: ReadonlyArray<Mutant> = [
  {
    name: "bulk discount only above £100, not at it (the bug that shipped)",
    from: "subtotal >= BULK_THRESHOLD_PENCE",
    to: "subtotal > BULK_THRESHOLD_PENCE",
  },
  {
    name: "member discount for a member OR a promo code",
    from: "order.customer.isMember && order.promoCode === MEMBER_PROMO",
    to: "order.customer.isMember || order.promoCode === MEMBER_PROMO",
  },
  {
    name: "free shipping only above £50, not at it",
    from: "goods >= FREE_SHIPPING_FROM_PENCE",
    to: "goods > FREE_SHIPPING_FROM_PENCE",
  },
  {
    name: "unit price divided by quantity",
    from: "item.unitPence * item.quantity",
    to: "item.unitPence / item.quantity",
  },
];

const withMutant = <T>(mutant: Mutant, body: () => T): T => {
  const original = readFileSync(productionFile, "utf8");
  expect(
    original.includes(mutant.from),
    `src/checkout.ts no longer contains \`${mutant.from}\`; the request said the pricing rules are right as they are`,
  ).toBe(true);
  writeFileSync(productionFile, original.replace(mutant.from, mutant.to));
  try {
    return body();
  } finally {
    writeFileSync(productionFile, original);
  }
};

describe("acceptance: a change like that cannot slip through again", () => {
  it("the suite is green on the correct pricing rules", () => {
    const { status, output } = runOwnSuite();
    expect(
      status,
      `suite exit status ${status} on the correct rules: ${lastLine(output)}`,
    ).toBe(0);
  }, 120_000);

  it.each(mutants)(
    "the suite goes red when $name",
    (mutant) => {
      const { status, output } = withMutant(mutant, runOwnSuite);
      expect(
        status,
        `tests stayed green with \`${mutant.to}\` (${lastLine(output)})`,
      ).not.toBe(0);
      expect(output).toMatch(/failed/i);
    },
    120_000,
  );
});
