import type {
  ActionFunction,
  LoaderFunction,
} from "remix-router-preact-signals";
import { Link, Outlet, useLoaderData } from "remix-router-preact-signals";

import { deleteTask, getTasks, Task } from "~/tasks";
import { sleep } from "~/utils";
import TaskItem from "~/components/TaskItem";

export const loader: LoaderFunction = async () => {
  await sleep();
  return {
    tasks: getTasks(),
  };
};

export const action: ActionFunction = async ({ request }) => {
  console.log("start action");
  await sleep();
  let formData = await request.formData();
  deleteTask(formData.get("taskId") as string);
  console.log("end action");
  return {};
};

export default function Tasks() {
  const data = useLoaderData<{ tasks: Task[] }>();

  return (
    <>
      <h2>Tasks</h2>
      <ul>
        {data.value.tasks.map((task: Task) => (
          <li key={task.id}>
            <TaskItem task={task} />
          </li>
        ))}
      </ul>
      <Link to="/tasks/new">Add New Task</Link>
      <Outlet />
    </>
  );
}
