import {
  AgnosticIndexRouteObject,
  AgnosticNonIndexRouteObject,
  LazyRouteFunction,
  AgnosticRouteMatch,
  RouterState,
  Router as RemixRouter,
  HydrationState,
  To,
  Fetcher,
} from "@remix-run/router";
import { TemplateResult } from "lit";
import { DirectiveResult } from "lit/async-directive.js";
import { FormDirective } from "./directives/form-directive";
import { SubmitOptions } from "./dom";

// Create Lit-specific types from the agnostic types in @remix-run/router to
// export from remix-router-lit
export interface IndexRouteObject {
  caseSensitive?: AgnosticIndexRouteObject["caseSensitive"];
  path?: AgnosticIndexRouteObject["path"];
  id?: AgnosticIndexRouteObject["id"];
  loader?: AgnosticIndexRouteObject["loader"];
  action?: AgnosticIndexRouteObject["action"];
  hasErrorBoundary?: AgnosticIndexRouteObject["hasErrorBoundary"];
  shouldRevalidate?: AgnosticIndexRouteObject["shouldRevalidate"];
  handle?: AgnosticIndexRouteObject["handle"];
  index: true;
  children?: undefined;
  template?: TemplateResult | null;
  errorTemplate?: TemplateResult | null;
}

export interface NonIndexRouteObject {
  caseSensitive?: AgnosticNonIndexRouteObject["caseSensitive"];
  path?: AgnosticNonIndexRouteObject["path"];
  id?: AgnosticNonIndexRouteObject["id"];
  loader?: AgnosticNonIndexRouteObject["loader"];
  action?: AgnosticNonIndexRouteObject["action"];
  hasErrorBoundary?: AgnosticNonIndexRouteObject["hasErrorBoundary"];
  shouldRevalidate?: AgnosticNonIndexRouteObject["shouldRevalidate"];
  handle?: AgnosticNonIndexRouteObject["handle"];
  index?: false;
  children?: RouteObject[];
  template?: TemplateResult | null;
  errorTemplate?: TemplateResult | null;
  lazy?: LazyRouteFunction<RouteObject>;
}

export type RouteObject = IndexRouteObject | NonIndexRouteObject;

export type DataRouteObject = RouteObject & {
  children?: DataRouteObject[];
  id: string;
};

export type RouteMatch<
  ParamKey extends string = string,
  RouteObjectType extends RouteObject = RouteObject
> = AgnosticRouteMatch<ParamKey, RouteObjectType>;

export type DataRouteMatch = RouteMatch<string, DataRouteObject>;

// Global context holding the singleton router and the current state
export interface RouterContext {
  router: RemixRouter;
  state: RouterState;
}

// Wrapper context holding the route location in the current hierarchy
export interface RouteContext {
  id: string;
  matches: DataRouteMatch[];
  index: boolean;
}

// Wrapper context holding the captured render error
export interface RouteErrorContext {
  error: unknown;
}

interface CreateRouterOpts {
  basename?: string;
  hydrationData?: HydrationState;
}

export interface CreateMemoryRouterOpts extends CreateRouterOpts {
  initialEntries?: string[];
  initialIndex?: number;
}

export interface CreateBrowserRouterOpts extends CreateRouterOpts {
  window?: Window;
}

export interface CreateHashRouterOpts extends CreateRouterOpts {
  window?: Window;
}

export interface NavigateOptions {
  replace?: boolean;
  state?: unknown;
}

export type FetcherWithDirective<TData> = Fetcher<TData> & {
  submit(
    target:
      | HTMLFormElement
      | HTMLButtonElement
      | HTMLInputElement
      | FormData
      | URLSearchParams
      | { [name: string]: string }
      | null,
    options?: SubmitOptions
  ): void;
  enhanceForm(options?: {
    replace: boolean;
  }): DirectiveResult<typeof FormDirective>;
  load: (href: string) => void;
};

export type SubmitTarget =
  | HTMLFormElement
  | HTMLButtonElement
  | HTMLInputElement
  | FormData
  | URLSearchParams
  | { [name: string]: string }
  | null;

export type HTMLFormSubmitter = HTMLButtonElement | HTMLInputElement;

export interface NavigateFunction {
  (to: To, options?: NavigateOptions): void;
  (delta: number): void;
}
