/**
 * Test Factory Function Template
 *
 * Factory pattern for test data:
 * - Complete objects with sensible defaults
 * - Accept Partial<T> overrides
 * - Validate against schema (if available)
 * - No let or beforeEach (immutable approach)
 *
 * @category Templates/Testing
 * @source citypaul/.dotfiles/docs/testing.md
 */

import { UserSchema, type User } from '../schemas/user.schema';

/**
 * Factory function for User test data
 *
 * @param overrides - Optional partial user data to override defaults
 * @returns Valid User object validated against schema
 */
export const getMockUser = (overrides?: Partial<User>): User => {
  const defaults: User = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    role: 'user',
    firstName: 'Test',
    lastName: 'User',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const userData = { ...defaults, ...overrides };

  // Validate against real schema to catch type mismatches
  return UserSchema.parse(userData);
};

// Example: Nested object factory composition
import { AddressSchema, type Address } from '../schemas/address.schema';

export const getMockAddress = (overrides?: Partial<Address>): Address => {
  const defaults: Address = {
    addressLine1: '123 Test Street',
    city: 'Test City',
    postcode: 'TE1 1ST',
  };

  return AddressSchema.parse({ ...defaults, ...overrides });
};

import { OrderSchema, type Order } from '../schemas/order.schema';

export const getMockOrder = (overrides?: Partial<Order>): Order => {
  const defaults: Order = {
    id: 'order-123',
    customerId: 'cust-456',
    items: [],
    total: 0,
    shippingAddress: getMockAddress(), // Compose factories
    createdAt: new Date(),
  };

  return OrderSchema.parse({ ...defaults, ...overrides });
};

// Usage in tests:
describe('Order processing', () => {
  it('should calculate correct total', () => {
    const order = getMockOrder({
      items: [
        { sku: 'ITEM-1', price: 10, quantity: 2 },
        { sku: 'ITEM-2', price: 15, quantity: 1 },
      ],
    });

    const total = calculateOrderTotal(order);
    expect(total).toBe(35);
  });

  it('should apply free shipping for orders over £50', () => {
    const order = getMockOrder({
      items: [{ sku: 'ITEM-1', price: 60, quantity: 1 }],
    });

    const shipping = calculateShipping(order);
    expect(shipping).toBe(0);
  });
});
