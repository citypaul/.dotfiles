// Stand-in for the payment provider's SDK client. We do not own this API shape.
// The provider forwards whatever headers we put on the charge to its gateway.

export type Charge = {
  readonly amountPence: number;
  readonly currency: "GBP";
  readonly cardToken: string;
  readonly headers: Readonly<Record<string, string>>;
};

export type Receipt = {
  readonly paymentId: string;
  readonly capturedPence: number;
};

export type PaymentsClient = {
  readonly charge: (charge: Charge) => Promise<Receipt>;
};
