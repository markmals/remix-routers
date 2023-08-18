import { useComputed } from "@preact/signals";
import { Link, useFetcher } from "remix-router-preact-signals";

import type { Task } from "../tasks";

export interface TaskItemProps {
  task: Task;
}

export default function TaskItem({ task }: TaskItemProps) {
  let taskFetcher = useFetcher();
  let Form = taskFetcher.Form;

  let isDeleting = useComputed(() => {
    console.log(taskFetcher.fetcher.value.state);
    return !!taskFetcher.fetcher.value.formData;
  });
  let text = useComputed(() => (isDeleting.value ? "Deleting..." : "❌"));

  return (
    <>
      <span>{task.task}</span> <Link to={`/tasks/${task.id}`}>Open</Link>{" "}
      <Form style={{ display: "inline" }} action="/tasks" method="post">
        <button
          type="submit"
          name="taskId"
          value={task.id}
          disabled={isDeleting}
        >
          {text}
        </button>
      </Form>
    </>
  );
}
