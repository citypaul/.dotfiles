# Glossary — Lending context

| Term | Code name | Definition | Rejected aliases |
|---|---|---|---|
| **Patron** | `Patron`, `PatronId` | A person who may borrow from the library. | Member, User, Customer, Borrower, Reader |
| **Item** | `Item`, `ItemId` | One physical copy that can be lent. | Book, Copy, Stock |
| **Loan** | `Loan`, `LoanId` | An Item lent to a Patron. A Loan is **open** from the day it opens until the Item is returned, when it becomes **returned**. | Borrowing, Checkout, Rental, Lending record |
| **Loan period** | `LOAN_PERIOD_DAYS` | 21 days from the day a Loan opens. The Loan is due on the last day. | Due window, Term |
| **Renewal** | — | Extends an open Loan by one Loan period from its current due date. At most **2** per Loan. Not allowed while a Hold exists on the Item. | Extension, Rollover |
| **Hold** | `Hold`, `HoldId` | A Patron's request for an Item that is currently on Loan. | Reservation, Request, Waitlist entry |
| **Lending limit** | `LENDING_LIMIT` | A Patron may have at most **5** open Loans. | Cap, Max books, Allowance |
| **Fine** | `Fine` | Money owed for a late return: **20 pence per day late, capped at £5.00**. Fines are amounts in whole pence. | Fee, Penalty, Charge, Late fee |
| **Due date** | — | The day a Loan must be returned by. | Deadline |

## Operations

| Operation | Code name | Outcomes when refused |
|---|---|---|
| Open a Loan for a Patron and an Item | `openLoan` | `lending-limit-reached`, `item-on-loan` |
| Renew a Loan | `renewLoan` | `loan-not-open`, `renewal-limit-reached`, `hold-exists` |
| Return an Item | `returnItem` | `loan-not-open` |
| Fine for a Loan returned on a day | `fineFor` | — (always an amount, possibly zero) |

Refused outcomes are expected business results, not errors: an operation returns
`{ success: true, value }` or `{ success: false, reason }` where `reason` is one of the
strings above.

## Domain events

| Event | Raised when | Carries |
|---|---|---|
| `LoanOpened` | A Loan opens. | `loanId`, `patronId`, `itemId` |
| `ItemReturned` | An Item is returned. | `loanId`, `itemId`, `returnedOn` |
