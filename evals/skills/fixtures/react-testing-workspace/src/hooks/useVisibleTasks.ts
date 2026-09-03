import { useMemo, useState } from "react";
import type { StatusFilter, Task } from "../tasks";

export type VisibleTasks = {
  readonly query: string;
  readonly status: StatusFilter;
  readonly visible: ReadonlyArray<Task>;
  readonly setQuery: (query: string) => void;
  readonly setStatus: (status: StatusFilter) => void;
};

export const useVisibleTasks = (tasks: ReadonlyArray<Task>): VisibleTasks => {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tasks.filter(
      (task) =>
        (needle === "" || task.title.toLowerCase().includes(needle)) &&
        (status === "all" || task.status === status),
    );
  }, [tasks, query, status]);

  return { query, status, visible, setQuery, setStatus };
};
