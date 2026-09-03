export type TaskStatus = "open" | "done";

export type StatusFilter = TaskStatus | "all";

export type Task = {
  readonly id: string;
  readonly title: string;
  readonly assignee: string;
  readonly status: TaskStatus;
};

export const describeCount = (shown: number, total: number): string =>
  shown === total
    ? `${total} ${total === 1 ? "task" : "tasks"}`
    : `${shown} of ${total} tasks`;
