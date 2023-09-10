import { ContextProvider } from "@lit-labs/context";
import { RouterState, Router as RemixRouter } from "@remix-run/router";
import { LitElement, html, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { routerContext } from "../context";
import { outletImpl } from "../outlet-impl";

@customElement("router-provider")
export class RouterProvider extends LitElement {
  @property({ attribute: false }) router!: RemixRouter;
  @property({ attribute: false }) fallback?: TemplateResult<1>;

  private provider = new ContextProvider(this, { context: routerContext });

  @state()
  private state!: RouterState;

  connectedCallback() {
    super.connectedCallback();
    this.state = this.router.state;
    this.provider.setValue({ state: this.state, router: this.router });
    this.router.subscribe((state) => {
      this.state = state;
      this.provider.setValue({ state: state, router: this.router });
    });
  }

  render() {
    if (!this.state.initialized) {
      return this.fallback ? this.fallback : html`<span></span>`;
    }

    return outletImpl({
      routerContext: { router: this.router, state: this.router.state },
      root: true,
    });
  }
}
