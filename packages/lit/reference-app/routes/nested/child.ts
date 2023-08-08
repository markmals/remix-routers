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
  return json<LoaderData>({ data: "child loader data" });
}

@customElement("app-child")
export class Child extends LitElement {
  private router = new RouterController(this);

  get data() {
    return this.router.loaderData<LoaderData>();
  }

  render() {
    return html`
      <h3>Child Route</h3>
      <p id="child">Child data: ${this.data?.data}</p>
    `;
  }
}
