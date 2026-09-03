import { useVisibleTasks } from "../hooks/useVisibleTasks";
import { describeCount, type StatusFilter, type Task } from "../tasks";
import { TaskRow } from "./TaskRow";

type TaskBoardProps = {
  readonly tasks: ReadonlyArray<Task>;
};

const FILTERS: ReadonlyArray<{ readonly value: StatusFilter; readonly label: string }> = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "done", label: "Done" },
];

export const TaskBoard = ({ tasks }: TaskBoardProps) => {
  const { query, status, visible, setQuery, setStatus } = useVisibleTasks(tasks);

  return (
    <section className="task-board" aria-labelledby="task-board-heading">
      <h2 id="task-board-heading">Tasks</h2>

      <label className="task-board__label" htmlFor="task-search">
        Search tasks
      </label>
      <input
        id="task-search"
        className="task-board__search"
        data-testid="task-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <div role="group" aria-label="Filter by status" className="task-board__filters">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className="task-board__filter"
            data-testid={`filter-${filter.value}`}
            aria-pressed={status === filter.value}
            onClick={() => setStatus(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <p className="task-board__count" data-testid="task-count">
        {describeCount(visible.length, tasks.length)}
      </p>

      {visible.length === 0 ? (
        <p className="task-board__empty" data-testid="empty-state">
          No tasks match those filters
        </p>
      ) : (
        <ul className="task-board__list" aria-label="Matching tasks">
          {visible.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </ul>
      )}
    </section>
  );
};
