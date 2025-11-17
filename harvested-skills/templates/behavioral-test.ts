/**
 * Behavioral Test Template
 *
 * Behavior-driven testing principles:
 * - Test WHAT the code should do (behavior)
 * - NOT HOW it does it (implementation)
 * - Test through public API only
 * - Use factory functions for test data
 * - Descriptive test names documenting behavior
 *
 * @category Templates/Testing
 * @source citypaul/.dotfiles/docs/testing.md
 */

import { describe, it, expect } from 'vitest';
import { processPayment } from './payment-processor';
import { getMockPayment } from '../test-factories/payment.factory';

describe('Payment processing', () => {
  // ✅ GOOD - Tests behavior through public API
  it('should reject payments with negative amounts', () => {
    const payment = getMockPayment({ amount: -100 });

    const result = processPayment(payment);

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('Amount must be positive');
  });

  it('should reject payments exceeding maximum amount', () => {
    const payment = getMockPayment({ amount: 10001 });

    const result = processPayment(payment);

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('Amount exceeds limit');
  });

  it('should process valid payments successfully', () => {
    const payment = getMockPayment({
      amount: 100,
      cardId: 'card-valid-123',
    });

    const result = processPayment(payment);

    expect(result.success).toBe(true);
    expect(result.data?.transactionId).toMatch(/^txn-\d+$/);
  });

  it('should include timestamp in successful payment receipt', () => {
    const payment = getMockPayment({ amount: 50 });

    const result = processPayment(payment);

    expect(result.success).toBe(true);
    expect(result.data?.timestamp).toBeInstanceOf(Date);
  });

  // Example: Testing edge cases
  it('should handle exactly zero amount as invalid', () => {
    const payment = getMockPayment({ amount: 0 });

    const result = processPayment(payment);

    expect(result.success).toBe(false);
  });

  it('should handle exactly maximum amount as valid', () => {
    const payment = getMockPayment({ amount: 10000 });

    const result = processPayment(payment);

    expect(result.success).toBe(true);
  });
});

// ❌ BAD - Implementation-focused test (ANTI-PATTERN)
/*
describe('Payment processing (BAD EXAMPLES)', () => {
  it('should call validateAmount method', () => {
    // ❌ Testing internal implementation detail
    const spy = jest.spyOn(validator, 'validateAmount');
    processPayment(payment);
    expect(spy).toHaveBeenCalled();
  });

  it('should access payment.amount property', () => {
    // ❌ Testing how code accesses data
    const payment = getMockPayment({ amount: 100 });
    expect(payment.amount).toBe(100);
  });
});
*/

// Example: React component behavioral test
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentForm } from './PaymentForm';

describe('PaymentForm component', () => {
  // ✅ GOOD - Tests user-visible behavior
  it('should display error message for invalid amount', async () => {
    const user = userEvent.setup();
    render(<PaymentForm />);

    const amountInput = screen.getByLabelText(/amount/i);
    const submitButton = screen.getByRole('button', { name: /submit/i });

    await user.type(amountInput, '-100');
    await user.click(submitButton);

    expect(screen.getByText(/amount must be positive/i)).toBeInTheDocument();
  });

  it('should submit form with valid data', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PaymentForm onSubmit={onSubmit} />);

    const amountInput = screen.getByLabelText(/amount/i);
    const submitButton = screen.getByRole('button', { name: /submit/i });

    await user.type(amountInput, '100');
    await user.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 100 })
    );
  });

  // ❌ BAD - Testing implementation
  /*
  it('should update state when typing in input', async () => {
    // ❌ Testing internal state management
    const { container } = render(<PaymentForm />);
    const input = container.querySelector('#amount-input');
    // Testing implementation detail (how state is managed)
  });
  */
});
