import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";

import type { LoaderFunctionArgs } from "@remix-run/router";
import { ITask as ITask, getTasks } from "../../tasks";
import { sleep } from "../../utils";
import { Router } from "remix-router-lit";

export async function loader({ params }: LoaderFunctionArgs) {
  await sleep();
  return {
    task: getTasks().find((t) => t.id === params.id),
  };
}

@customElement("app-task")
export class Task extends LitElement {
  private router = new Router(this);

  get data() {
    return this.router.loaderData<{ task: ITask | undefined }>();
  }

  render() {
    return html`
      <h3>Task</h3>
      <p>${this.data?.task?.name}</p>
    `;
  }
}
