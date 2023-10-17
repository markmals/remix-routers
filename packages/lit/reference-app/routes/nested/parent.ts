import { json } from "@remix-run/router";
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { Router } from "remix-router-lit";
import { sleep } from "../../utils";

export async function loader() {
  await sleep();
  return json({ data: "parent loader data" });
}

@customElement("app-parent")
export class Parent extends LitElement {
  router = new Router(this);

  get loaderData() {
    return this.router.loaderData as { data: string };
  }

  render() {
    return html`
      <h2>Parent Layout</h2>
      <p id="parent">Parent data: ${this.loaderData?.data}</p>
      ${this.router.outlet()}
    `;
  }
}
