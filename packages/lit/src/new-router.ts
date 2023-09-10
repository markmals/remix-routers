import {
  ContextConsumer,
  ContextProvider,
  consume,
  createContext,
} from "@lit-labs/context";
import {
  AgnosticIndexRouteObject,
  AgnosticNonIndexRouteObject,
  LazyRouteFunction,
  AgnosticRouteMatch,
  Router as RemixRouter,
  RouterState,
  Navigation,
  Location,
  Action as NavigationType,
  createBrowserHistory,
  createRouter,
  HydrationState,
} from "@remix-run/router";
import {
  LitElement,
  ReactiveElement,
  TemplateResult,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators.js";
import invariant from "tiny-invariant";

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

const RouterContextSymbol = Symbol();
const RouteContextSymbol = Symbol();
const RouteErrorSymbol = Symbol();

const routerContext = createContext<RouterContext>(RouterContextSymbol);
const routeContext = createContext<RouteContext>(RouteContextSymbol);
const routeErrorContext = createContext<RouteErrorContext>(RouteErrorSymbol);

interface CreateRouterOpts {
  basename?: string;
  hydrationData?: HydrationState;
}

interface CreateBrowserRouterOpts extends CreateRouterOpts {
  window?: Window;
}

export function createBrowserRouter(
  routes: RouteObject[],
  { basename, hydrationData, window }: CreateBrowserRouterOpts = {}
) {
  return createRouter({
    basename,
    history: createBrowserHistory({ window }),
    hydrationData,
    routes: enhanceManualRouteObjects(routes),
  }).initialize();
}

export class Router {
  private host: ReactiveElement;
  private routerConsumer: ContextConsumer<
    typeof routerContext,
    ReactiveElement
  >;
  private routeConsumer: ContextConsumer<typeof routeContext, ReactiveElement>;
  private routeErrorConsumer: ContextConsumer<
    typeof routeErrorContext,
    ReactiveElement
  >;

  constructor(host: ReactiveElement) {
    this.host = host;

    this.routerConsumer = new ContextConsumer(this.host, {
      context: routerContext,
      subscribe: true,
    });

    this.routeConsumer = new ContextConsumer(this.host, {
      context: routeContext,
      subscribe: true,
    });

    this.routeErrorConsumer = new ContextConsumer(this.host, {
      context: routeErrorContext,
      subscribe: true,
    });
  }

  public get routerContext() {
    invariant(
      this.routerConsumer.value !== undefined,
      "No RouterContext available"
    );
    return this.routerConsumer.value;
  }

  public get routeContext() {
    invariant(
      this.routeConsumer.value !== undefined,
      "No RouteContext available"
    );
    return this.routeConsumer.value;
  }

  public get routeErrorContext() {
    return this.routeErrorConsumer.value;
  }

  public get navigationType(): NavigationType {
    return this.routerContext.state.historyAction;
  }

  public get location(): Location {
    return this.routerContext.state.location;
  }

  public get matches(): DataRouteMatch[] {
    return this.routerContext.state.matches.map((match) => ({
      id: match.route.id,
      pathname: match.pathname,
      pathnameBase: match.pathnameBase,
      route: match.route,
      params: match.params,
      data: this.routerContext.state.loaderData[match.route.id] as unknown,
      handle: match.route.handle as unknown,
    }));
  }

  public get navigation(): Navigation {
    return this.routerContext.state.navigation;
  }

  public loaderData<T = unknown>(): T | undefined {
    let routeId = this.routeContext.id;
    return this.routeLoaderData(routeId);
  }

  public routeLoaderData<T = unknown>(routeId: string): T | undefined {
    return this.routerContext.state.loaderData[routeId] as T;
  }

  public actionData<T = unknown>(): T | undefined {
    let routeId = this.routeContext.id;
    return this.routerContext.state.actionData?.[routeId] as T;
  }

  public get routeError(): unknown {
    let ctx = this.routerContext;
    let routeId = this.routeContext.id;
    let errorCtx = this.routeErrorContext;

    // If this was a render error, we put it in a RouteError context inside
    // of RenderErrorBoundary.  Otherwise look for errors from our data router
    // state
    return (errorCtx?.error || ctx.router.state.errors?.[routeId]) as unknown;
  }
}

@customElement("route-wrapper")
export class RouteWrapper extends LitElement {
  @property({ attribute: false }) id!: string;
  @property({ attribute: false }) index!: boolean;

  private routeContext = new ContextProvider(this, { context: routeContext });

  constructor() {
    super();

    new ContextConsumer(this, {
      context: routerContext,
      callback: (routerContext) => {
        if (routerContext?.state) {
          this.routeContext.setValue({
            id: this.id,
            matches: routerContext.state.matches.slice(
              0,
              routerContext.state.matches.findIndex(
                (m) => m.route.id === this.id
              ) + 1
            ),
            index: this.index === true,
          });
        }
      },
      subscribe: true,
    });
  }

  render() {
    return html`<slot></slot>`;
  }
}

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

export type HTMLTemplateResult = TemplateResult<1>;

@customElement("router-provider")
export class RouterProvider extends LitElement {
  @property({ attribute: false }) router!: RemixRouter;
  @property({ attribute: false }) fallback?: HTMLTemplateResult;

  private provider = new ContextProvider(this, { context: routerContext });

  @state()
  private state!: RouterState;

  connectedCallback() {
    super.connectedCallback();
    this.state = this.router.state;
    this.provider.setValue({ state: this.state, router: this.router });
    this.router.subscribe((state) => {
      console.log(state);
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

function outletImpl(options: {
  routerContext: RouterContext;
  routeContext: RouteContext;
}): unknown;
function outletImpl(options: {
  routerContext: RouterContext;
  root: true;
}): unknown;
function outletImpl({
  routerContext,
  routeContext: routeCtx,
  root = false,
}: {
  routerContext: RouterContext;
  routeContext?: RouteContext;
  root?: boolean;
}) {
  // let router = routerContext?.router;
  let routeContext = root ? null : routeCtx;
  let matches = routerContext?.state?.matches;
  let idx = matches.findIndex((m) => m.route.id === routeContext?.id);

  if (idx < 0 && !root) {
    throw new Error(
      `Unable to find <router-outlet> match for route id: ${
        routeContext?.id || "_root_"
      }`
    );
  }

  let matchToRender = matches[idx + 1] as DataRouteMatch | undefined;

  if (!matchToRender) {
    // We found an <router-outlet> but do not have deeper matching paths so we
    // end the render tree here
    return nothing;
  }

  // Grab the error if we've reached the correct boundary.  Type must remain
  // unknown since user's can throw anything from a loader/action.
  // let error: unknown =
  //   router.state.errors?.[matchToRender.route.id] != null
  //     ? Object.values(router.state.errors)[0]
  //     : null;

  return html`
    <route-wrapper
      .id="${matchToRender.route.id}"
      .index="${matchToRender.route.index === true}"
    >
      ${matchToRender.route.template}
    </route-wrapper>
  `;
}

function enhanceManualRouteObjects(routes: RouteObject[]): RouteObject[] {
  return routes.map((route) => {
    let routeClone = { ...route };
    if (routeClone.hasErrorBoundary == null) {
      routeClone.hasErrorBoundary = routeClone.errorTemplate != null;
    }
    if (routeClone.children) {
      routeClone.children = enhanceManualRouteObjects(routeClone.children);
    }
    return routeClone;
  });
}
