import { ActionFunctionArgs } from "@remix-run/router";
import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { map } from "lit/directives/map.js";
import { Router } from "remix-router-lit";
import { deleteTask, getTasks } from "../../tasks";
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
  router = new Router(this);

  get data() {
    return this.router.loaderData as Awaited<ReturnType<typeof loader>>;
  }

  render() {
    return html`
      <h2>Tasks</h2>
      <ul>
        ${map(
          this.data.tasks,
          (task) => html`
            <li>
              <app-task-item .task=${task}></app-task-item>
            </li>
          `,
        )}
      </ul>
      <a href="/tasks/new" ${this.router.enhanceLink()}>Add New Task</a>
      ${this.router.outlet()}
    `;
  }
}
