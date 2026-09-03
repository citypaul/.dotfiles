// Plain-text statement. The PDF service wraps this output verbatim in a
// monospace block, so column widths matter.

import { formatPence } from "./money";

export type StatementLine = {
  readonly date: string;
  readonly description: string;
  readonly pence: number;
};

const LABEL_WIDTH = 24;
const AMOUNT_WIDTH = 12;

function amountColumn(pence: number): string {
  const text = pence < 0 ? "(" + formatPence(-pence) + ")" : formatPence(pence);
  return text.padStart(AMOUNT_WIDTH);
}

export function renderStatement(accountName: string, period: string, lines: StatementLine[]): string {
  let out = "Statement for " + accountName + "\n";
  out += "Period: " + period + "\n";
  out += "\n";
  let total = 0;
  if (lines.length == 0) {
    out += "(no activity)\n";
  }
  for (const line of lines) {
    let label = line.description;
    if (label.length >= LABEL_WIDTH) label = label.slice(0, LABEL_WIDTH - 1) + "…";
    out += line.date.slice(5) + "  " + label.padEnd(LABEL_WIDTH) + "  " + amountColumn(line.pence) + "\n";
    total += line.pence;
  }
  out += "\n";
  out += "       " + "Total".padEnd(LABEL_WIDTH) + "  " + amountColumn(total) + "\n";
  return out;
}
