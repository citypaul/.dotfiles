# Greenfield Development Sequence

How to start a hexagonal project from scratch. For introducing hex arch into an existing codebase, see `incremental-adoption.md` — this is its greenfield twin. Distilled from *Hexagonal Architecture Explained* (Cockburn & Garrido de Paz), Ch 4.9 and Ch 5.2; citations in `references.md`.

## Step 0: Create the First Honest Boundary

Before writing code, use the `structure-codebase` skill to choose the physical shape. Create only the directories needed by the first real slice: a visible provider-free `hexagon/`, the first outside driving/driven adapter locations, and outside test interactors. Put concrete wiring in the executable entrypoint or its `composition/` directory. Do not scaffold empty layers, ports, or adapters for hypothetical features.

## Step 1: Driving Side — the App Returns a Constant

Define the first driving port — the interface only. Then RED first: write a unit test that calls the driving port and expects a constant, and watch it fail. Only then write the smallest implementation behind the port: no parameters beyond the essentials, returning that constant (the classic fake-it step).

```typescript
// hexagon/tax/for-calculating-taxes.ts — first driving port
interface ForCalculatingTaxes {
  readonly taxOn: (amount: Money) => Money;
}

// tests: expect the constant
it('returns the flat placeholder tax', () => {
  const calculator = createTaxCalculation();
  expect(calculator.taxOn(createMoney(100, 'GBP'))).toEqual(createMoney(0, 'GBP'));
});
```

This first test is deliberately disposable — but be precise about which test that is. It is an inner-loop **unit** test, and returning the constant is the classic fake-it step: Step 2 triangulates the fake away, and rewriting or deleting this unit scaffold then is ordinary red-green work. It is **never** a locked acceptance test: where a project runs an ATDD outer loop with human-approved specs (see the `acceptance-testing` skill, where installed), the walking-skeleton acceptance spec is authored and confirmed failing *before* this sequence begins, asserts end-to-end plumbing rather than the placeholder value, and is not yours to rewrite or delete — this sequence orders the implementation *inside* that outer test, not around it.

## Step 2: Driven Side — a Fake Returns a Constant

Define the first driven port and an outside fake under `testing/` that returns a simple value. RED first again: update the test to build the fake, pass it in, and expect the fake's value — use a *different* value than Step 1 so the test fails against the hardcoded constant. Then triangulate: change the app to take the driven port as a constructor/factory parameter and consult it instead of hardcoding.

```typescript
// hexagon/tax/tax-rate-provider.ts — first driven port
interface TaxRateProvider {
  readonly rateFor: (amount: Money) => TaxRate;
}

const createTaxCalculation = (rates: TaxRateProvider): ForCalculatingTaxes => ({
  taxOn: (amount) => applyRate(amount, rates.rateFor(amount)),
});
```

**The architecture is now complete.** One driving port, one driven port, a configurator (the test), and an app with zero source dependencies on anything outside. Everything after this point is growth, not architecture.

## Step 3: Add a Real Driving Adapter

Connect the real driver — route handler, CLI command, queue consumer — still against the fake driven port. The driving adapter parses input, delegates to the driving port, and translates the result. The executable entrypoint supplies the fake: it may compose inline while the graph is trivial, otherwise it uses the host's composition root. Two drivers (tests and the real one) now exercise the same port.

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
