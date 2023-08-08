import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { RouterController } from "remix-router-lit";

import { ActionFunctionArgs } from "@remix-run/router";
import { map } from "lit/directives/map.js";
import { Task, deleteTask, getTasks } from "../../tasks";
import { sleep } from "../../utils";

export async function loader() {
  await sleep();
  return {
    tasks: getTasks(),
  };
}

export async function action({ request }: ActionFunctionArgs) {
  await sleep();
  let formData = await request.formData();
  deleteTask(formData.get("taskId") as string);
  return {};
}

@customElement("app-tasks")
export class Tasks extends LitElement {
  private router = new RouterController(this);

  get data() {
    return this.router.loaderData<{ tasks: Task[] }>();
  }

  render() {
    return html`
      <h2>Tasks</h2>
      <ul>
        ${map(
          this.data?.tasks,
          (task) => html`
            <li>
              <app-task-item .task=${task}></app-task-item>
            </li>
          `,
        )}
      </ul>
      <a href="/tasks/new" ${this.router.enhanceLink()}>Add New Task</a>
      <remix-outlet></remix-outlet>
    `;
  }
}
