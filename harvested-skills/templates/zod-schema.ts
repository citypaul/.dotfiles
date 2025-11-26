/**
 * Zod Schema Template with Type Inference
 *
 * Schema-first development pattern:
 * 1. Define schema with validation rules
 * 2. Derive TypeScript type from schema
 * 3. Use schema at runtime boundaries
 *
 * @category Templates/Validation
 * @source citypaul/.dotfiles/docs/examples.md
 */

import { z } from 'zod';

// Define schema first - provides runtime validation
export const AddressSchema = z.object({
  addressLine1: z.string().min(1),
  city: z.string().min(1),
  postcode: z.string().regex(/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i),
});

// Derive type from schema
export type Address = z.infer<typeof AddressSchema>;

// Use at trust boundary (API, user input, external data)
export const parseAddress = (data: unknown): Address => {
  return AddressSchema.parse(data);
};

// Example: Complex nested schema
export const PaymentRequestSchema = z.object({
  amount: z.number().positive().max(10000),
  currency: z.string().length(3),
  cardDetails: z.object({
    number: z.string().regex(/^\d{16}$/),
    cvv: z.string().regex(/^\d{3,4}$/),
    expiry: z.string().regex(/^\d{2}\/\d{2}$/),
  }),
  billingAddress: AddressSchema, // Compose schemas
});

export type PaymentRequest = z.infer<typeof PaymentRequestSchema>;

// Example: Schema composition with extends
const BaseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CustomerSchema = BaseEntitySchema.extend({
  email: z.string().email(),
  tier: z.enum(['standard', 'premium', 'enterprise']),
});

export type Customer = z.infer<typeof CustomerSchema>;
