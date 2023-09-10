import {
  createBrowserRouter,
  RouterProvider,
  RouteObject,
} from "remix-router-preact-signals";

import Boundary from "~/components/Boundary";
import Index from "~/routes/Index";
import Parent, { loader as parentLoader } from "~/routes/nested/Parent";
import Child, { loader as childLoader } from "~/routes/nested/Child";
import Redirect, { loader as redirectLoader } from "./routes/Redirect";
import ErrorComponent, { loader as errorLoader } from "./routes/Error";
import Root from "~/routes/Root";
import Tasks, {
  action as tasksAction,
  loader as tasksLoader,
} from "~/routes/tasks/Tasks";
import Task, { loader as taskLoader } from "~/routes/tasks/Task";
import NewTask, { action as newTaskAction } from "~/routes/tasks/NewTask";
import Defer, { loader as deferLoader } from "~/routes/Defer";

let routes: RouteObject[] = [
  {
    path: "/",
    Component: Root,
    children: [
      {
        index: true,
        Component: Index,
      },
      {
        path: "parent",
        loader: parentLoader,
        Component: Parent,
        ErrorBoundary: Boundary,
        children: [
          {
            path: "child",
            loader: childLoader,
            Component: Child,
          },
          {
            path: "error",
            loader: errorLoader,
            Component: ErrorComponent,
          },
        ],
      },
      {
        path: "redirect",
        loader: redirectLoader,
        Component: Redirect,
      },
      {
        path: "error",
        loader: errorLoader,
        Component: ErrorComponent,
      },
      {
        path: "tasks",
        loader: tasksLoader,
        action: tasksAction,
        Component: Tasks,
        children: [
          {
            path: ":id",
            loader: taskLoader,
            Component: Task,
          },
          {
            path: "new",
            action: newTaskAction,
            Component: NewTask,
          },
        ],
      },
      {
        path: "defer",
        loader: deferLoader,
        Component: Defer,
      },
    ],
  },
];

let router = createBrowserRouter(routes);

export default function App() {
  return <RouterProvider router={router} fallbackElement={<p>Loading...</p>} />;
}
