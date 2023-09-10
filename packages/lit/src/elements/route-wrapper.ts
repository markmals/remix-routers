import { ContextProvider, ContextConsumer } from "@lit-labs/context";
import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { routeContext, routerContext } from "../context";

@customElement("route-wrapper")
export class RouteWrapper extends LitElement {
  @property({ attribute: false }) routeId!: string;
  @property({ attribute: false }) index!: boolean;

  private routeContext = new ContextProvider(this, { context: routeContext });

  connectedCallback() {
    super.connectedCallback();

    let routerCtx = new ContextConsumer(this, {
      context: routerContext,
      subscribe: true,
    });

    this.routeContext.setValue({
      id: this.id,
      matches: routerCtx.value!.state.matches.slice(
        0,
        routerCtx.value!.state.matches.findIndex(
          (m) => m.route.id === this.id
        ) + 1
      ),
      index: this.index === true,
    });
  }

  render() {
    return html`<slot></slot>`;
  }
}
