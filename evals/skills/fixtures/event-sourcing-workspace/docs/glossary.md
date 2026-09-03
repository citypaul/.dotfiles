# Glossary — Wallet ledger context

| Term | Code name | Definition | Rejected aliases |
|---|---|---|---|
| **Wallet** | `Wallet`, `WalletId` | A prepaid balance we hold for one customer, in a single currency. | Account, Purse, Pot |
| **Top-up** | `TopUp` | Money the customer adds to a Wallet. | Deposit, Load, Recharge |
| **Charge** | `Charge` | Money taken from a Wallet to pay for something. | Debit, Payment, Withdrawal |
| **Balance** | `balancePence` | What a Wallet is worth, in whole pence. Never negative. | Funds, Credit |
| **Currency** | `currency` | Fixed when the Wallet is opened; `"GBP"` for now. | — |
| **Statement** | — | What support and the customer see: one line per top-up and charge, oldest first, each with the balance after it. | Transactions, Ledger view |

## Operations

| Operation | Command | Outcomes when refused |
|---|---|---|
| Open a Wallet in a currency | `Open` | `already-open` |
| Top up a Wallet | `TopUp` | `not-open`, `invalid-amount` |
| Charge a Wallet | `Charge` | `not-open`, `invalid-amount`, `insufficient-funds` |

Refused outcomes are expected business results, not errors.

## Money

All amounts are whole pence, as safe integers. A top-up or charge of zero or less, or
of a fraction of a penny, is `invalid-amount`.
