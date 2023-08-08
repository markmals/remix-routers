import { defer } from "@remix-run/router";
import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { RouterController } from "remix-router-lit";

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
  private router = new RouterController(this);

  get data() {
    return this.router.loaderData<{
      critical: string;
      lazy: Promise<string>;
      lazyError: Promise<string>;
    }>();
  }

  render() {
    return html`
      <p id="critical-data">Critical Data: ${this.data?.critical}</p>
      ${this.router.await({
        resolve: this.data?.lazy,
        fallback: html`<p id="lazy-value">Loading data...</p>`,
        template: (value) => html`<p id="lazy-value">Value: ${value}</p>`,
      })}
      ${this.router.await({
        resolve: this.data?.lazyError,
        fallback: html`<p id="lazy-error">Loading error...</p>`,
        template: (value) => html`<p>Value: ${value}</p>`,
        error: (error) => html`<p id="lazy-error">Error: ${error}</p>`,
      })}
    `;
  }
}
