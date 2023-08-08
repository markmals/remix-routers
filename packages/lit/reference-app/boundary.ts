import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { RouterController } from "remix-router-lit";

@customElement("app-error-boundary")
export class ErrorBoundary extends LitElement {
  private router = new RouterController(this);

  get error() {
    return this.router.routeError as { message: string };
  }

  render() {
    return html`
      <h2>Application Error Boundary</h2>
      <p>${this.error.message}</p>
      <a href="/" ${this.router.enhanceLink()}>Go home</a>
    `;
  }
}
