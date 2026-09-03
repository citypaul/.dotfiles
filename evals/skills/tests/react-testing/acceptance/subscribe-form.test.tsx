// Hidden acceptance test: the subscribe form's behaviour as the product owner
// describes it. It builds state only through the rendered UI, so any test
// harness, file layout or helper the agent chose leaves it passing; it fails
// only if the component's behaviour changed.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SubscribeForm } from "./components/SubscribeForm";

describe("acceptance: subscribe form", () => {
  it("hands the details over when the form is filled in", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SubscribeForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/full name/i), "Alice Adams");
    await user.type(screen.getByLabelText(/email address/i), "alice@example.com");
    await user.selectOptions(screen.getByLabelText(/plan/i), "yearly");
    await user.click(screen.getByRole("button", { name: /subscribe/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Alice Adams",
      email: "alice@example.com",
      plan: "yearly",
    });
  });

  it("refuses an email address that is not one, and says so", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SubscribeForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/full name/i), "Alice Adams");
    await user.type(screen.getByLabelText(/email address/i), "alice@example");
    await user.click(screen.getByRole("button", { name: /subscribe/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/does not look right/i);
    expect(screen.getByLabelText(/email address/i)).toHaveFocus();
  });

  it("asks for both fields when the form is empty and starts at the name", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SubscribeForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: /subscribe/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByRole("alert")).toHaveLength(2);
    expect(screen.getByLabelText(/full name/i)).toHaveFocus();
  });
});
