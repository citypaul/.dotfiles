import { describe, expect, it } from "vitest";
import { renderStatement } from "./statement";

// Pins what src/statement.ts renders today, character for character. The PDF
// service wraps this verbatim, so the task was to make it safe to change, not
// to tidy it.
describe("acceptance: renderStatement still renders as deployed", () => {
  it("renders a statement with charges, a credit and long labels", () => {
    const text = renderStatement("Acme Ltd", "March 2026", [
      { date: "2026-03-01", description: "Monthly subscription", pence: 3100 },
      { date: "2026-03-14", description: "Credit for outage on 12 March", pence: -250 },
      { date: "2026-03-20", description: "123456789012345678901234", pence: 5 },
      { date: "2026-03-21", description: "12345678901234567890123", pence: 123456 },
    ]);

    expect(text).toBe(
      [
        "Statement for Acme Ltd",
        "Period: March 2026",
        "",
        "03-01  Monthly subscription            £31.00",
        "03-14  Credit for outage on 12…       (£2.50)",
        "03-20  12345678901234567890123…         £0.05",
        "03-21  12345678901234567890123      £1,234.56",
        "",
        "       Total                        £1,263.11",
        "",
      ].join("\n"),
    );
  });

  it("renders a placeholder row and a zero total when there are no lines", () => {
    expect(renderStatement("Acme Ltd", "March 2026", [])).toBe(
      ["Statement for Acme Ltd", "Period: March 2026", "", "(no activity)", "", "       Total                            £0.00", ""].join("\n"),
    );
  });
});
