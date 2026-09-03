export type BasketLine = {
  readonly sku: string;
  readonly name: string;
  readonly unitPricePence: number;
  readonly quantity: number;
};

export const startingBasket: ReadonlyArray<BasketLine> = [
  {
    sku: "GS-JACKET",
    name: "Trail Runner Jacket",
    unitPricePence: 8999,
    quantity: 1,
  },
  {
    sku: "GS-BOTTLE",
    name: "Insulated Bottle",
    unitPricePence: 1899,
    quantity: 2,
  },
];
