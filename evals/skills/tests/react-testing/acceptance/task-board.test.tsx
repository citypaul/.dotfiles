// Hidden acceptance test: what the task board shows as someone searches and
// filters. Drives the board only through its rendered UI.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TaskBoard } from "./components/TaskBoard";
import type { Task } from "./tasks";

const tasks: ReadonlyArray<Task> = [
  { id: "1", title: "Review the pricing page", assignee: "Alice", status: "open" },
  { id: "2", title: "Ship the invoice fix", assignee: "Bruno", status: "done" },
  { id: "3", title: "Review the onboarding email", assignee: "Cleo", status: "done" },
];

describe("acceptance: task board", () => {
  it("shows every task until something is filtered", () => {
    render(<TaskBoard tasks={tasks} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("3 tasks")).toBeInTheDocument();
  });

  it("narrows the list to titles matching the search, whatever the case", async () => {
    const user = userEvent.setup();
    render(<TaskBoard tasks={tasks} />);

    await user.type(screen.getByLabelText(/search tasks/i), "REVIEW");

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("2 of 3 tasks")).toBeInTheDocument();
    expect(screen.queryByText(/invoice fix/i)).not.toBeInTheDocument();
  });

  it("narrows the list to the chosen status", async () => {
    const user = userEvent.setup();
    render(<TaskBoard tasks={tasks} />);

    await user.click(screen.getByRole("button", { name: /^open$/i }));

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText(/pricing page/i)).toBeInTheDocument();
  });

  it("says so when nothing matches", async () => {
    const user = userEvent.setup();
    render(<TaskBoard tasks={tasks} />);

    await user.type(screen.getByLabelText(/search tasks/i), "nothing like this");

    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.getByText(/no tasks match/i)).toBeInTheDocument();
  });
});
