export type Line = {
  sku: string;
  name: string;
  unitPence: number;
  quantity: number;
};

export type Basket = {
  currency: string;
  lines: Line[];
};

export function createBasket(currency: string): Basket {
  return { currency, lines: [] };
}

export function addLine(
  basket: Basket,
  sku: string,
  name: string,
  unitPence: number,
  quantity: number,
): Basket {
  for (let i = 0; i < basket.lines.length; i++) {
    const line = basket.lines[i];
    if (line) {
      if (line.sku === sku) {
        line.quantity += quantity;
        return basket;
      }
    }
  }
  basket.lines.push({ sku, name, unitPence, quantity });
  return basket;
}

export function removeLine(basket: Basket, sku: string): Basket {
  for (let i = basket.lines.length - 1; i >= 0; i--) {
    const line = basket.lines[i];
    if (line) {
      if (line.sku === sku) {
        basket.lines.splice(i, 1);
      }
    }
  }
  return basket;
}

export function changeQuantity(basket: Basket, sku: string, quantity: number): Basket {
  for (let i = 0; i < basket.lines.length; i++) {
    const line = basket.lines[i];
    if (line) {
      if (line.sku === sku) {
        if (quantity <= 0) {
          basket.lines.splice(i, 1);
        } else {
          line.quantity = quantity;
        }
        return basket;
      }
    }
  }
  return basket;
}

export function basketTotal(basket: Basket): number {
  let total = 0;
  for (let i = 0; i < basket.lines.length; i++) {
    const line = basket.lines[i];
    if (line) {
      total += line.unitPence * line.quantity;
    }
  }
  return total;
}

export function lineCount(basket: Basket): number {
  let count = 0;
  for (let i = 0; i < basket.lines.length; i++) {
    const line = basket.lines[i];
    if (line) {
      count += line.quantity;
    }
  }
  return count;
}
