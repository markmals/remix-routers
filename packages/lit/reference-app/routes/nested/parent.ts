import { json } from "@remix-run/router";
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { RouterController } from "remix-router-lit";
import { sleep } from "../../utils";

interface LoaderData {
  data: string;
}

export async function loader() {
  await sleep();
  return json<LoaderData>({ data: "parent loader data" });
}

@customElement("app-parent")
export class Parent extends LitElement {
  private router = new RouterController(this);

  get data() {
    return this.router.loaderData<LoaderData>();
  }

  render() {
    return html`
      <h2>Parent Layout</h2>
      <p id="parent">Parent data: ${this.data?.data}</p>
      <remix-outlet></remix-outlet>
    `;
  }
}
