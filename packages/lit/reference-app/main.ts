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
      template: html`<app-root></app-root>`,
      children: [
        {
          index: true,
          template: html`<app-index></app-index>`,
        },
        {
          path: "parent",
          loader: parentLoader,
          template: html`<app-parent></app-parent>`,
          errorTemplate: html`<app-error-boundary></app-error-boundary>`,
          children: [
            {
              path: "child",
              loader: childLoader,
              template: html`<app-child></app-child>`,
            },
            {
              path: "error",
              loader: errorLoader,
              template: html`<app-error></app-error>`,
            },
          ],
        },
        {
          path: "redirect",
          loader: redirectLoader,
          template: html`<app-redirect></app-redirect>`,
        },
        {
          path: "error",
          loader: errorLoader,
          template: html`<app-error></app-error>`,
        },
        {
          path: "tasks",
          loader: tasksLoader,
          action: tasksAction,
          template: html`<app-tasks></app-tasks>`,
          children: [
            {
              path: ":id",
              loader: taskLoader,
              template: html`<app-task></app-task>`,
            },
            {
              path: "new",
              action: newTaskAction,
              template: html`<app-new-task></app-new-task>`,
            },
          ],
        },
        {
          path: "defer",
          loader: deferLoader,
          template: html`<app-defer></app-defer>`,
        },
      ],
    },
  ];

  router = createBrowserRouter(this.routes);
  fallback = html`<p>Loading...</p>`;

  render() {
    return html`
      <router-provider
        .router=${this.router}
        .fallback=${this.fallback}
      ></router-provider>
    `;
  }
}
