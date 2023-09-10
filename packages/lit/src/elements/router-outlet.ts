import { consume } from "@lit-labs/context";
import { LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { routerContext, routeContext } from "../context";
import { RouterContext, RouteContext } from "../types";
import { outletImpl } from "../outlet-impl";

@customElement("router-outlet")
export class Outlet extends LitElement {
  @consume({ context: routerContext, subscribe: true })
  routerContext!: RouterContext;
  @consume({ context: routeContext, subscribe: true })
  routeContext!: RouteContext;

  render() {
    return outletImpl({
      routerContext: this.routerContext,
      routeContext: this.routeContext,
    });
  }
}
