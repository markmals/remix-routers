import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";

import type { LoaderFunctionArgs } from "@remix-run/router";
import { Router } from "remix-router-lit";
import { getTasks } from "../../tasks";
import { sleep } from "../../utils";

export async function loader({ params }: LoaderFunctionArgs) {
  await sleep();
  return {
    task: getTasks().find((t) => t.id === params.id)!,
  };
}

@customElement("app-task")
export class Task extends LitElement {
  router = new Router(this);

  get data() {
    return this.router.loaderData as Awaited<ReturnType<typeof loader>>;
  }

  render() {
    return html`
      <h3>Task</h3>
      <p>${this.data.task.name}</p>
    `;
  }
}
