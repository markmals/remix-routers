import { useComputed, useSignalEffect } from "@preact/signals";
import { Link, useFetcher } from "remix-router-preact-signals";

import type { ITask } from "../tasks";

export interface TaskItemProps {
  task: ITask;
}

export default function TaskItem({ task }: TaskItemProps) {
  let { fetcher, Form } = useFetcher();
  let isDeleting = useComputed(() => !!fetcher.value.formData);
  let text = useComputed(() => (isDeleting.value ? "Deleting..." : "❌"));

  return (
    <>
      <span>{task.name}</span> <Link to={`/tasks/${task.id}`}>Open</Link>{" "}
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
