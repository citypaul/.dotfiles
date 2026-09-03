import { useRef, useState, type FormEvent } from "react";

import "./SubscribeForm.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type Plan = "monthly" | "yearly";

export type Subscription = {
  readonly name: string;
  readonly email: string;
  readonly plan: Plan;
};

type SubscribeFormProps = {
  readonly onSubmit: (subscription: Subscription) => void;
};

type Errors = {
  name?: string;
  email?: string;
};

export const SubscribeForm = ({ onSubmit }: SubscribeFormProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<Plan>("monthly");
  const [errors, setErrors] = useState<Errors>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: Errors = {};
    if (name.trim() === "") {
      nextErrors.name = "Enter your name";
    }
    if (email.trim() === "") {
      nextErrors.email = "Enter your email address";
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      nextErrors.email = "That email address does not look right";
    }
    setErrors(nextErrors);

    const invalidFields = Object.keys(nextErrors);
    if (invalidFields.length > 0) {
      const firstInvalid =
        nextErrors.name !== undefined ? nameRef.current : emailRef.current;
      firstInvalid?.focus();
      return;
    }

    onSubmit({ name: name.trim(), email: email.trim(), plan });
    setName("");
    setEmail("");
  };

  return (
    <form className="subscribe-form" onSubmit={handleSubmit} noValidate>
      <h2>Subscribe to the weekly digest</h2>

      <label className="subscribe-form__label" htmlFor="subscribe-name">
        Full name
      </label>
      <input
        id="subscribe-name"
        className="subscribe-form__input"
        data-testid="subscribe-name"
        ref={nameRef}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      {errors.name !== undefined && (
        <p className="subscribe-form__error" data-testid="name-error" role="alert">
          {errors.name}
        </p>
      )}

      <label className="subscribe-form__label" htmlFor="subscribe-email">
        Email address
      </label>
      <input
        id="subscribe-email"
        className="subscribe-form__input"
        data-testid="subscribe-email"
        ref={emailRef}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      {errors.email !== undefined && (
        <p className="subscribe-form__error" data-testid="email-error" role="alert">
          {errors.email}
        </p>
      )}

      <label className="subscribe-form__label" htmlFor="subscribe-plan">
        Plan
      </label>
      <select
        id="subscribe-plan"
        className="subscribe-form__select"
        data-testid="subscribe-plan"
        value={plan}
        onChange={(event) => setPlan(event.target.value as Plan)}
      >
        <option value="monthly">Monthly</option>
        <option value="yearly">Yearly</option>
      </select>

      <button type="submit" className="subscribe-form__submit" data-testid="subscribe-submit">
        Subscribe
      </button>
    </form>
  );
};
