# Greenfield Development Sequence

How to start a hexagonal project from scratch. For introducing hex arch into an existing codebase, see `incremental-adoption.md` — this is its greenfield twin. Distilled from *Hexagonal Architecture Explained* (Cockburn & Garrido de Paz), Ch 4.9 and Ch 5.2; citations in `references.md`.

## Step 0: Create the Folders First

Before writing any code, create the skeleton: domain (with port locations), driven adapters (including `fakes/`), driving adapters/delivery, tests. With an empty-but-correct structure in place, every subsequent file placement is obvious — this one habit removes most "where does this go?" confusion. Use the `folder-structure` skill's protected-domain-core layout if it applies.

## Step 1: Driving Side — the App Returns a Constant

Define the first driving port and the smallest possible implementation behind it: no parameters beyond the essentials, returning a constant. Write a test that calls the driving port and expects that constant.

```typescript
// domain/tax/for-calculating-taxes.ts — first driving port
interface ForCalculatingTaxes {
  readonly taxOn: (amount: Money) => Money;
}

// tests: expect the constant
it('returns the flat placeholder tax', () => {
  const calculator = createTaxCalculation();
  expect(calculator.taxOn(createMoney(100, 'GBP'))).toEqual(createMoney(0, 'GBP'));
});
```

This first test is deliberately disposable. Once the app consults a driven port (Step 2), the constant-only behavior disappears, and this test gets rewritten or deleted. That's fine — its job was to prove the driving-side connection.

## Step 2: Driven Side — a Fake Returns a Constant

Define the first driven port and a fake in `adapters/fakes/` that returns a simple value. Change the app to take the driven port as a constructor/factory parameter and consult it instead of hardcoding. Update the test to build the fake, pass it in, and expect the fake's value (use a *different* value than Step 1, to prove the wiring changed).

```typescript
// domain/tax/tax-rate-provider.ts — first driven port
interface TaxRateProvider {
  readonly rateFor: (amount: Money) => TaxRate;
}

const createTaxCalculation = (rates: TaxRateProvider): ForCalculatingTaxes => ({
  taxOn: (amount) => applyRate(amount, rates.rateFor(amount)),
});
```

**The architecture is now complete.** One driving port, one driven port, a configurator (the test), and an app with zero source dependencies on anything outside. Everything after this point is growth, not architecture.

## Step 3: Add a Real Driving Adapter

Connect the real driver — route handler, CLI command, queue consumer — still against the fake driven port. The driving adapter parses input, wires, delegates to the driving port, and translates the result. Two drivers (tests and the real one) now exercise the same port.

## Step 4: Add a Real Driven Adapter

Choose the real technology (database, HTTP client, file) and implement the driven port in the adapters layer, with a narrow integration test (see `testing-hex-arch.md`). The use case tests keep running on the fake, untouched.

## The Four Wirings

The steps trace a deliberate progression of configurations:

| Wiring | Driver | Driven | When |
|--------|--------|--------|------|
| test-to-test | Test cases | Fake | Step 2 — architecture done |
| real-to-test | Real driving adapter | Fake | Step 3 |
| test-to-real | Test cases | Real adapter (test DB) | Step 4 integration tests |
| real-to-real | Real driving adapter | Real adapter | Production |

After Step 2, the remaining wirings can land in any order.

## Walking Skeleton

Connect the real technologies (Steps 3–4) for a nearly-empty transaction *before* building out business logic. This is risk management: technology hookups are where surprises live, and doing them first also stands up the test and delivery pipeline. Then grow the domain, the ports, and the adapters in parallel, in any order the work demands.
