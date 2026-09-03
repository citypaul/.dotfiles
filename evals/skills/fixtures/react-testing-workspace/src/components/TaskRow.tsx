import type { Task } from "../tasks";
import { TaskTitle } from "./TaskTitle";

type TaskRowProps = {
  readonly task: Task;
};

export const TaskRow = ({ task }: TaskRowProps) => (
  <li className="task-row" data-testid="task-row" data-task-id={task.id}>
    <TaskTitle title={task.title} />
    <span className="task-row__assignee">{task.assignee}</span>
    <span className="task-row__status">
      {task.status === "done" ? "Done" : "Open"}
    </span>
  </li>
);
