import { provide } from "@lit-labs/context";
import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { RouteErrorContext } from "..";
import { routeErrorContext } from "../context";

@customElement("route-error-wrapper")
export class ErrorWrapper extends LitElement {
  @property({ attribute: false }) error!: unknown;

  @provide({ context: routeErrorContext })
  routeErrorContext!: RouteErrorContext;

  connectedCallback() {
    super.connectedCallback();
    this.routeErrorContext = { error: this.error };
  }

  render() {
    return html`<slot></slot>`;
  }
}
