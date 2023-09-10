import { json } from "@remix-run/router";
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { sleep } from "../../utils";
import { Router } from "remix-router-lit";

interface LoaderData {
  data: string;
}

export async function loader() {
  await sleep();
  return json<LoaderData>({ data: "parent loader data" });
}

@customElement("app-parent")
export class Parent extends LitElement {
  private router = new Router(this);

  get data() {
    return this.router.loaderData<LoaderData>();
  }

  render() {
    return html`
      <h2>Parent Layout</h2>
      <p id="parent">Parent data: ${this.data?.data}</p>
      <router-outlet></router-outlet>
    `;
  }
}
