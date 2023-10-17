import { json } from "@remix-run/router";
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { Router } from "remix-router-lit";
import { sleep } from "../../utils";

export async function loader() {
  await sleep();
  return json({ data: "child loader data" });
}

@customElement("app-child")
export class Child extends LitElement {
  private router = new Router(this);

  get loaderData() {
    return this.router.loaderData as { data: string };
  }

  render() {
    return html`
      <h3>Child Route</h3>
      <p id="child">Child data: ${this.loaderData.data}</p>
    `;
  }
}
