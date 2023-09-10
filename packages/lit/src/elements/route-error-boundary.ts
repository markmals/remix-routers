import { LitElement, TemplateResult, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { when } from "lit/directives/when.js";

@customElement("route-error-boundary")
export class ErrorBoundary extends LitElement {
  @property({ attribute: false }) template!: TemplateResult;
  @property({ attribute: false }) error?: unknown;

  constructor() {
    super();

    window.addEventListener("error", (event) => {
      this.error = event.error;
    });

    window.addEventListener("unhandledrejection", (event) => {
      this.error = event.reason;
    });
  }

  render() {
    return when(
      this.error,
      () => html`
        <route-error-wrapper .error=${this.error}
          >${this.template}</route-error-wrapper
        >
      `,
      () => html`<slot></slot>`
    );
  }
}
