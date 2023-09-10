import { LoaderFunctionArgs, json } from "@remix-run/router";
import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { Router } from "../../src/new-router";

export async function loader({ request }: LoaderFunctionArgs) {
  let isLoaderError =
    new URL(request.url).searchParams.get("type") === "loader";
  if (isLoaderError) {
    throw new Error("Loader error!");
  }
  return json({});
}

@customElement("app-error")
export class ErrorElement extends LitElement {
  private router = new Router(this);

  get data() {
    return this.router.loaderData() as any;
  }

  render() {
    return html`<h2>Render Error: ${this.data?.foo.bar}</h2>`;
  }
}
