import { LoaderFunctionArgs, useLoaderData } from "remix-router-preact-signals";

import { getTasks, Task as ITask } from "~/tasks";
import { sleep } from "~/utils";

export async function loader({ params }: LoaderFunctionArgs) {
  await sleep();
  return {
    task: getTasks().find((t) => t.id === params.id),
  };
}

export default function Task() {
  const data = useLoaderData<{ task?: ITask }>();

  return (
    <>
      <h3>Task</h3>
      <p>{data.value.task?.task}</p>
    </>
  );
}
