export type BasketLine = {
  readonly sku: string;
  readonly quantity: number;
  readonly unitPricePence: number;
};

export type Basket = {
  readonly id: string;
  readonly lines: ReadonlyArray<BasketLine>;
};

export const basketTotalPence = (basket: Basket): number =>
  basket.lines.reduce(
    (total, line) => total + line.quantity * line.unitPricePence,
    0,
  );
