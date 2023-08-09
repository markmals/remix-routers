import { useComputed } from "@preact/signals";
import { Link, useFetcher } from "remix-router-preact-signals";

import type { Task } from "../tasks";

export interface TaskItemProps {
  task: Task;
}

export default function TaskItem({ task }: TaskItemProps) {
  let fetcher = useFetcher();
  let Form = useComputed(() => fetcher.value.Form);

  // FIXME: The fetcher state stops updating after the first submission
  let isDeleting = useComputed(() => {
    console.log(fetcher.value.state);
    return !!fetcher.value.formData;
  });
  let text = useComputed(() => (isDeleting.value ? "Deleting..." : "❌"));

  return (
    <>
      <span>{task.task}</span> <Link to={`/tasks/${task.id}`}>Open</Link>{" "}
      <Form.value style={{ display: "inline" }} action="/tasks" method="post">
        <button
          type="submit"
          name="taskId"
          value={task.id}
          disabled={isDeleting}
        >
          {text}
        </button>
      </Form.value>
    </>
  );
}
