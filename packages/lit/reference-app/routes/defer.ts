import { defer } from "@remix-run/router";
import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { Router } from "remix-router-lit";

const resolve = (data: any, ms: number) =>
  new Promise((r) => setTimeout(() => r(data), ms));
const reject = (data: any, ms: number) =>
  new Promise((_, r) => setTimeout(() => r(data), ms));

export async function loader() {
  return defer({
    critical: await resolve("Critical Data", 1000),
    lazy: resolve("Lazy Data ✅", 1000),
    lazyError: reject("Lazy Error 💥", 2000),
  });
}

@customElement("app-defer")
export class Defer extends LitElement {
  router = new Router(this);

  get data() {
    return this.router.loaderData as {
      critical: string;
      lazy: Promise<string>;
      lazyError: Promise<string>;
    };
  }

  render() {
    return html`
      <p id="critical-data">Critical Data: ${this.data.critical}</p>
      ${this.router.await(this.data.lazy, {
        pending: () => html`<p id="lazy-value">Loading data...</p>`,
        complete: (value) => html`<p id="lazy-value">Value: ${value}</p>`,
      })}
      ${this.router.await(this.data.lazyError, {
        pending: () => html`<p id="lazy-error">Loading error...</p>`,
        complete: (value) => html`<p>Value: ${value}</p>`,
        error: (error) => html`<p id="lazy-error">Error: ${error}</p>`,
      })}
    `;
  }
}
