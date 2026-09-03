export const formatPence = (pence: number): string =>
  `£${(pence / 100).toFixed(2)}`;

export const lineTotalPence = (
  unitPricePence: number,
  quantity: number,
): number => unitPricePence * quantity;

export const basketTotalPence = (
  lines: ReadonlyArray<{
    readonly unitPricePence: number;
    readonly quantity: number;
  }>,
): number =>
  lines.reduce(
    (total, line) => total + lineTotalPence(line.unitPricePence, line.quantity),
    0,
  );
