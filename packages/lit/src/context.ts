import { createContext } from "@lit-labs/context";
import { RouterContext, RouteContext, RouteErrorContext } from "./types";

const RouterContextSymbol = Symbol();
const RouteContextSymbol = Symbol();
const RouteErrorSymbol = Symbol();

export const routerContext = createContext<RouterContext>(RouterContextSymbol);
export const routeContext = createContext<RouteContext>(RouteContextSymbol);
export const routeErrorContext =
  createContext<RouteErrorContext>(RouteErrorSymbol);
