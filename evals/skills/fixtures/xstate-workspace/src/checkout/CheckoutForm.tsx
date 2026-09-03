import { useState } from "react";
import { basketTotalPence, type Basket } from "./basket";
import type { PlaceOrder } from "./place-order";

type CheckoutFormProps = {
  readonly basket: Basket;
  readonly placeOrder: PlaceOrder;
};

export const CheckoutForm = ({ basket, placeOrder }: CheckoutFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const submit = () => {
    if (isSubmitting) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    placeOrder(basket)
      .then((confirmation) => {
        setReference(confirmation.reference);
        setIsSubmitting(false);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Order failed");
        setIsSubmitting(false);
      });
  };

  if (reference !== null) {
    return <p>Order {reference} confirmed</p>;
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <h1>Checkout</h1>
      <p>Total {basketTotalPence(basket)}p</p>
      {error === null ? null : (
        <>
          <p role="alert">{error}</p>
          <button type="button" onClick={submit}>
            Try again
          </button>
        </>
      )}
      <button type="submit" disabled={isSubmitting}>
        Place order
      </button>
    </form>
  );
};
