/**
 * Result Type Template for Error Handling
 *
 * Type-safe error handling without exceptions:
 * - Discriminated union for success/failure
 * - Compile-time exhaustiveness checking
 * - Explicit error handling at call sites
 *
 * @category Templates/ErrorHandling
 * @source citypaul/.dotfiles/docs/examples.md
 */

/**
 * Result type for operations that can fail
 *
 * @template T - Success data type
 * @template E - Error type (defaults to Error)
 */
export type Result<T, E = Error> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

/**
 * Helper to create success result
 */
export const success = <T>(data: T): Result<T, never> => ({
  success: true,
  data,
});

/**
 * Helper to create failure result
 */
export const failure = <E>(error: E): Result<never, E> => ({
  success: false,
  error,
});

// Example: Custom error types
export type PaymentError =
  | { code: 'INSUFFICIENT_FUNDS'; message: string }
  | { code: 'INVALID_CARD'; message: string }
  | { code: 'NETWORK_ERROR'; message: string };

export type Payment = {
  readonly amount: number;
  readonly cardId: string;
};

export type Receipt = {
  readonly transactionId: string;
  readonly amount: number;
  readonly timestamp: Date;
};

/**
 * Process payment with explicit error handling
 */
export const processPayment = (
  payment: Payment
): Result<Receipt, PaymentError> => {
  // Validation
  if (payment.amount <= 0) {
    return failure({
      code: 'INVALID_CARD',
      message: 'Amount must be positive',
    });
  }

  // Simulate insufficient funds check
  if (payment.amount > 10000) {
    return failure({
      code: 'INSUFFICIENT_FUNDS',
      message: 'Amount exceeds limit',
    });
  }

  // Success case
  return success({
    transactionId: `txn-${Date.now()}`,
    amount: payment.amount,
    timestamp: new Date(),
  });
};

// Usage: Explicit error handling
const result = processPayment({ amount: 100, cardId: 'card-123' });

if (result.success) {
  // TypeScript knows result.data is Receipt
  console.log(`Payment processed: ${result.data.transactionId}`);
} else {
  // TypeScript knows result.error is PaymentError
  console.error(`Payment failed: ${result.error.code} - ${result.error.message}`);
}

// Example: Chaining operations with Result
export const map = <T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => U
): Result<U, E> => {
  if (result.success) {
    return success(fn(result.data));
  }
  return result;
};

export const chain = <T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => Result<U, E>
): Result<U, E> => {
  if (result.success) {
    return fn(result.data);
  }
  return result;
};

// Usage: Composition
const validateAndProcess = (payment: Payment): Result<Receipt, PaymentError> => {
  return chain(validatePayment(payment), (validated) =>
    processPayment(validated)
  );
};
