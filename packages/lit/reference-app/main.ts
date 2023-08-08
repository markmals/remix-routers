import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { RouteObject, createBrowserRouter } from "remix-router-lit";

import "./elements/boundary";
import "./elements/task-item";

import "./routes/index";
import "./routes/root";

import { loader as deferLoader } from "./routes/defer";
import { loader as errorLoader } from "./routes/error";
import { loader as childLoader } from "./routes/nested/child";
import { loader as parentLoader } from "./routes/nested/parent";
import { loader as redirectLoader } from "./routes/redirect";
import { action as newTaskAction } from "./routes/tasks/new-task";
import { loader as taskLoader } from "./routes/tasks/task";
import {
  action as tasksAction,
  loader as tasksLoader,
} from "./routes/tasks/tasks";

@customElement("app-main")
export class Main extends LitElement {
  routes: RouteObject[] = [
    {
      path: "/",
      element: "app-root",
      children: [
        {
          index: true,
          element: "app-index",
        },
        {
          path: "parent",
          loader: parentLoader,
          element: "app-parent",
          errorElement: "app-error-boundary",
          children: [
            {
              path: "child",
              loader: childLoader,
              element: "app-child",
            },
            {
              path: "error",
              loader: errorLoader,
              element: "app-error",
            },
          ],
        },
        {
          path: "redirect",
          loader: redirectLoader,
          element: "app-redirect",
        },
        {
          path: "error",
          loader: errorLoader,
          element: "app-error",
        },
        {
          path: "tasks",
          loader: tasksLoader,
          action: tasksAction,
          element: "app-tasks",
          children: [
            {
              path: ":id",
              loader: taskLoader,
              element: "app-task",
            },
            {
              path: "new",
              action: newTaskAction,
              element: "app-new-task",
            },
          ],
        },
        {
          path: "defer",
          loader: deferLoader,
          element: "app-defer",
        },
      ],
    },
  ];

  router = createBrowserRouter(this.routes);
  fallback = html`<p>Loading...</p>`;

  render() {
    return html`
      <remix-router-provider
        .router=${this.router}
        .fallback=${this.fallback}
      ></remix-router-provider>
    `;
  }
}
