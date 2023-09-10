/* eslint-disable */
import { ContextConsumer, createContext, provide } from "@lit-labs/context";
import {
  AbortedDeferredError,
  AgnosticIndexRouteObject,
  AgnosticNonIndexRouteObject,
  AgnosticRouteMatch,
  Fetcher,
  HydrationState,
  LazyRouteFunction,
  Location,
  Navigation,
  Action as NavigationType,
  Path,
  Router,
  RouterState,
  To,
  createBrowserHistory,
  createHashHistory,
  createMemoryHistory,
  createRouter,
  resolveTo,
  type FormEncType,
  type FormMethod,
} from "@remix-run/router";
import {
  ElementPart,
  LitElement,
  Part,
  ReactiveController,
  ReactiveControllerHost,
  ReactiveElement,
  TemplateResult,
  html,
  noChange,
  nothing,
} from "lit";
import {
  Directive,
  DirectiveParameters,
  DirectiveResult,
  PartInfo,
  PartType,
  directive,
} from "lit/async-directive.js";
import { customElement, property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { UntilDirective, until } from "lit/directives/until.js";
import { when } from "lit/directives/when.js";
import invariant from "tiny-invariant";
import { SubmitOptions, getFormSubmissionInfo } from "./dom";

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
  element?: string | null;
  errorElement?: string | null;
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
  element?: string | null;
  errorElement?: string | null;
  lazy?: LazyRouteFunction<RouteObject>;
}

export type RouteObject = IndexRouteObject | NonIndexRouteObject;

export type DataRouteObject = RouteObject & {
  children?: DataRouteObject[];
  id: string;
};

export interface RouteMatch<
  ParamKey extends string = string,
  RouteObjectType extends RouteObject = RouteObject
> extends AgnosticRouteMatch<ParamKey, RouteObjectType> {}

export interface DataRouteMatch extends RouteMatch<string, DataRouteObject> {}

// interface NavigationContextObject {
//     basename: string
//     navigator: Navigator
//     static: boolean
// }

// export interface DataRouterContextObject extends NavigationContextObject {
//     router: Router
//     staticContext?: StaticHandlerContext
// }

// Global context holding the singleton router and the current state
export interface RouterContext {
  router: Router;
  // this should be reactive, consider wrapping in a signal/observanle
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

interface CreateMemoryRouterOpts extends CreateRouterOpts {
  initialEntries?: string[];
  initialIndex?: number;
}

interface CreateBrowserRouterOpts extends CreateRouterOpts {
  window?: Window;
}

interface CreateHashRouterOpts extends CreateRouterOpts {
  window?: Window;
}

export interface NavigateOptions {
  replace?: boolean;
  state?: unknown;
}

type FetcherWithDirective<TData> = Fetcher<TData> & {
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

type SubmitTarget =
  | HTMLFormElement
  | HTMLButtonElement
  | HTMLInputElement
  | FormData
  | URLSearchParams
  | { [name: string]: string }
  | null;

type HTMLFormSubmitter = HTMLButtonElement | HTMLInputElement;

export interface NavigateFunction {
  (to: To, options?: NavigateOptions): void;
  (delta: number): void;
}

export function createMemoryRouter(
  routes: RouteObject[],
  {
    basename,
    hydrationData,
    initialEntries,
    initialIndex,
  }: CreateMemoryRouterOpts = {}
) {
  return createRouter({
    basename,
    history: createMemoryHistory({
      initialEntries,
      initialIndex,
    }),
    hydrationData,
    routes: enhanceManualRouteObjects(routes),
  }).initialize();
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

export function createHashRouter(
  routes: RouteObject[],
  { basename, hydrationData, window }: CreateHashRouterOpts = {}
) {
  return createRouter({
    basename,
    history: createHashHistory({ window }),
    hydrationData,
    routes: enhanceManualRouteObjects(routes),
  }).initialize();
}

let RouterContextSymbol = Symbol();
let RouteContextSymbol = Symbol();
let RouteErrorSymbol = Symbol();

export const routerContext = createContext<RouterContext>(RouterContextSymbol);
export const routeContext = createContext<RouteContext>(RouteContextSymbol);
export const routeErrorContext =
  createContext<RouteErrorContext>(RouteErrorSymbol);

let fetcherId = 0;

export class RouterController implements ReactiveController {
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

  private onStateChange: (() => void)[] = [];
  private onDisconnected: (() => void)[] = [];

  constructor(host: ReactiveElement) {
    this.host = host;
    host.addController(this);

    this.routerConsumer = new ContextConsumer(this.host, {
      context: routerContext,
      callback: (ctx) => (this.routerContext = ctx),
      subscribe: true,
    });

    this.routerContext = this.routerConsumer.value;

    this.routeConsumer = new ContextConsumer(this.host, {
      context: routeContext,
      callback: (ctx) => (this.routeContext = ctx),
      subscribe: true,
    });

    this.routeContext = this.routeConsumer.value;

    this.routeErrorConsumer = new ContextConsumer(this.host, {
      context: routeErrorContext,
      callback: (ctx) => (this.routeErrorContext = ctx),
      subscribe: true,
    });

    this.routeErrorContext = this.routeErrorConsumer.value;
  }

  hostDisconnected() {
    this.onDisconnected.forEach((fn) => fn());
  }

  // MARK: Reactive properties

  #routerContext: RouterContext | undefined;

  private get routerContext(): RouterContext {
    invariant(this.#routerContext !== undefined, "No RouterContext available");
    return this.#routerContext;
  }

  private set routerContext(newValue: RouterContext | undefined) {
    this.#routerContext = newValue;
    this.onStateChange.forEach((fn) => fn());
    this.host.requestUpdate();
  }

  #routeContext: RouteContext | undefined;

  private get routeContext(): RouteContext {
    invariant(this.#routeContext !== undefined, "No RouteContext available");
    return this.#routeContext;
  }

  private set routeContext(newValue: RouteContext | undefined) {
    this.#routeContext = newValue;
    this.host.requestUpdate();
  }

  #routeErrorContext: RouteErrorContext | undefined;

  private get routeErrorContext(): RouteErrorContext | undefined {
    return this.#routeErrorContext;
  }

  private set routeErrorContext(newValue: RouteErrorContext | undefined) {
    this.#routeErrorContext = newValue;
    this.host.requestUpdate();
  }

  // MARK: Reactive getters and methods

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
    return this.routeLoaderData(routeId) as any;
  }

  public routeLoaderData<T = unknown>(routeId: string): T | undefined {
    return this.routerContext.state.loaderData[routeId] as any;
  }

  public actionData<T = unknown>(): T | undefined {
    let routeId = this.routeContext.id;
    return this.routerContext.state.actionData?.[routeId] as any;
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

  public resolvedPath = (to: To): Path => {
    let { matches } = this.routeContext;

    return resolveTo(
      to,
      getPathContributingMatches(matches).map((match) => match.pathnameBase),
      this.location.pathname
    );
  };

  public href = (to: To): string => {
    let { router } = this.routerContext;
    let path = this.resolvedPath(to);
    return router.createHref(createURL(router, createPath(path)));
  };

  public navigate: NavigateFunction = (
    to: To | number,
    options: NavigateOptions = {}
  ) => {
    let { router } = this.routerContext;
    let { matches } = this.routeContext;

    if (typeof to === "number") {
      router.navigate(to);
      return;
    }

    let path = resolveTo(
      to,
      getPathContributingMatches(matches).map((match) => match.pathnameBase),
      this.location.pathname
    );

    router.navigate(path, {
      replace: options?.replace,
      state: options?.state,
    });
  };

  public formAction = (action = "."): string => {
    let { matches } = this.routeContext;
    let route = this.routeContext;

    let path = resolveTo(
      action,
      getPathContributingMatches(matches).map((match) => match.pathnameBase),
      this.location.pathname
    );

    let search = path.search;
    if (action === "." && route.index) {
      search = search ? search.replace(/^\?/, "?index&") : "?index";
    }

    return path.pathname + search;
  };

  public submit = (
    /**
     * Specifies the `<form>` to be submitted to the server, a specific
     * `<button>` or `<input type="submit">` to use to submit the form, or some
     * arbitrary data to submit.
     *
     * Note: When using a `<button>` its `name` and `value` will also be
     * included in the form data that is submitted.
     */
    target: SubmitTarget,
    /**
     * Options that override the `<form>`'s own attributes. Required when
     * submitting arbitrary data without a backing `<form>`.
     */
    options?: SubmitOptions
  ) => {
    let { router } = this.routerContext;
    let defaultAction = this.formAction();
    submitImpl(router, defaultAction, target, options);
  };

  // FIXME: Can I remove this generic argument and make this a getter?
  public fetcher = <TData = unknown>(): FetcherWithDirective<TData> => {
    let { router } = this.routerContext;
    let { id } = this.routeContext;
    let defaultAction = this.formAction();
    let fetcherKey = String(++fetcherId);

    const formDirective = directive(FormDirective);

    let fetcherExtras: Partial<FetcherWithDirective<TData>> = {
      enhanceForm: (options: { replace: boolean } = { replace: false }) => {
        return formDirective(this as any, options.replace, fetcherKey, id);
      },
      submit: (target, options = {}) => {
        return submitImpl(
          router,
          defaultAction,
          target,
          options,
          fetcherKey,
          id
        );
      },
      load: (href) => {
        return router.fetch(fetcherKey, id, href);
      },
    };

    let fetcher = router.getFetcher<TData>(fetcherKey);
    fetcherExtras = { ...fetcherExtras, ...fetcher };

    let unsubscribe: (() => void) | undefined;
    this.onStateChange.push(() => {
      if (unsubscribe) unsubscribe();
      unsubscribe = this.routerContext.router.subscribe(() => {
        fetcher = router.getFetcher<TData>(fetcherKey);
        fetcherExtras = { ...fetcherExtras, ...fetcher };
      });
    });

    this.onDisconnected.push(() => router.deleteFetcher(fetcherKey));

    return fetcherExtras as FetcherWithDirective<TData>;
  };

  public get fetchers(): Fetcher[] {
    let { state } = this.routerContext;
    return [...state.fetchers.values()];
  }

  private directives = {
    link: directive(LinkDirective),
    form: directive(FormDirective),
  };

  public enhanceLink = (): DirectiveResult<typeof LinkDirective> => {
    return this.directives.link(this);
  };

  public enhanceForm = (
    options: { replace: boolean } = { replace: false }
  ): DirectiveResult<typeof FormDirective> => {
    return this.directives.form(this as any, options.replace, null, null);
  };

  public await = <T>(options: {
    resolve: Promise<T> | T | undefined;
    template: (value: T) => TemplateResult;
    fallback?: TemplateResult;
    error?: (error: unknown) => TemplateResult;
  }): DirectiveResult<typeof UntilDirective> => {
    const resolve = async () => {
      if (resolve === undefined) return options.fallback ?? html``;

      try {
        let promise: Promise<T> =
          options.resolve instanceof Promise
            ? options.resolve
            : Promise.resolve(options.resolve as T);
        let value = await promise;
        return options.template(value);
      } catch (error) {
        if (error instanceof AbortedDeferredError) {
          // This deferred was aborted, await indefinitely to show the fallback
          // until either (1) we render the next route and this component is
          // unmounted, or (2) we get replaced with a new Promise for this route
          await new Promise(() => {
            // no-op
          });
        }
        if (options.error) {
          return options.error?.(error);
        } else {
          throw error;
        }
      }
    };

    return until(resolve(), options.fallback);
  };
}

type _RouterController = Omit<
  RouterController,
  "routerContext" | "routeContext" | "routeErrorContext"
> & {
  routerContext: RouterContext;
  routeContext: RouteContext;
  routeErrorContext: RouteErrorContext;
};

@customElement("remix-router-provider")
export class RouterProvider extends LitElement {
  @property({ attribute: false }) router!: Router;
  @property({ attribute: false }) fallback?: TemplateResult<any>;
  @property({ attribute: false }) hydrationData?: HydrationState;

  @state() state!: RouterState;

  @provide({ context: routerContext })
  @state()
  routerContext!: RouterContext;

  unsubscribe!: () => void;

  connectedCallback() {
    super.connectedCallback();
    this.state = this.router.state;
    this.routerContext = { router: this.router, state: this.state };
    this.unsubscribe = this.router.subscribe((state) => {
      this.state = state;
      this.routerContext = { router: this.router, state: state };
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubscribe();
  }

  public get routerMatches(): DataRouteMatch[] {
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

  render() {
    if (!this.state.initialized) {
      return this.fallback ? this.fallback : html`<span></span>`;
    }

    return outletImpl(
      {
        routerContext: this.routerContext,
        routeContext: null,
        matches: this.routerMatches,
      },
      true
    );
  }
}

@customElement("remix-route-wrapper")
export class RouteWrapper extends LitElement {
  @property({ attribute: false }) id!: string;
  @property({ attribute: false }) index!: boolean;

  routerController = new RouterController(this);

  @provide({ context: routeContext })
  @state()
  routeContext!: RouteContext;

  connectedCallback() {
    super.connectedCallback();
    this.routeContext = {
      id: this.id,
      matches: this.routerController.matches.slice(
        0,
        this.routerController.matches.findIndex((m) => m.route.id === this.id)
      ),
      index: this.index === true,
    };
  }

  render() {
    return html`<slot></slot>`;
  }
}

@customElement("remix-error-wrapper")
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

@customElement("remix-error-boundary")
export class ErrorBoundary extends LitElement {
  @property({ attribute: false }) elementTag!: string;
  @property({ attribute: false }) error?: unknown;

  child = unsafeHTML(`<${this.elementTag}></${this.elementTag}>`);

  render() {
    return when(
      this.error,
      () => html`
        <remix-error-wrapper .error=${this.error}
          >${this.child}</remix-error-wrapper
        >
      `,
      () => html`<slot></slot>`
    );
  }
}

type OutletController = {
  routerContext: RouterContext;
  routeContext: RouteContext | null;
  matches: DataRouteMatch[];
};

function outletImpl(controller: OutletController, root: boolean = false) {
  let state = controller.routerContext.state;
  let routeContext = root ? null : controller.routeContext;

  console.log(controller.matches);
  console.log(routeContext?.id);

  let idx = controller.matches.findIndex(
    (m) => m.route.id === routeContext?.id
  );

  if (idx < 0 && !root) {
    throw new Error(
      `Unable to find <remix-outlet> match for route id: ${
        routeContext?.id || "_root_"
      }`
    );
  }

  let matchToRender = controller.matches[idx + 1];

  if (!matchToRender) {
    // We found a <remix-outlet> but do not have deeper matching paths so we
    // end the render tree here
    return nothing;
  }

  // Grab the error if we've reached the correct boundary.  Type must remain
  // unknown since user's can throw anything from a loader/action.
  let error: unknown =
    state.errors?.[matchToRender.route.id] != null
      ? Object.values(state.errors)[0]
      : null;

  const child = unsafeHTML(
    !!matchToRender.route.element
      ? `<${matchToRender.route.element}></${matchToRender.route.element}>`
      : ""
  );

  return html`
    <remix-route-wrapper
      .id=${matchToRender.route.id}
      .index=${matchToRender.route.index === true}
    >
      ${when(
        root || error || matchToRender.route.errorElement,
        () => html`
          <remix-error-boundary
            .error=${error}
            .elementTag=${matchToRender.route.errorElement ||
            "remix-default-error"}
          >
            ${child}
          </remix-error-boundary>
        `,
        () => html`${child}`
      )}
    </remix-route-wrapper>
  `;
}

@customElement("remix-outlet")
export class Outlet extends LitElement {
  routerController = new RouterController(this);

  render() {
    return outletImpl(this.routerController as any);
  }
}

export class LinkDirective extends Directive {
  constructor(partInfo: PartInfo) {
    super(partInfo);

    if (partInfo.type !== PartType.ELEMENT) {
      throw new Error("LinkDirective must be used on an anchor element");
    }
  }

  render(_routerController: RouterController) {
    return noChange;
  }

  isAttached = false;

  private attachListener(
    part: ElementPart,
    routerController: RouterController
  ) {
    if (!this.isAttached) {
      const nav = routerController.navigate.bind(routerController);
      part.element.addEventListener("click", this.linkHandler(nav));
      this.isAttached = true;
    }
    // TODO: Figure out how to clean this listener up
    // part.element.removeEventListener("click", handler)
  }

  update(part: Part, [routerController]: DirectiveParameters<this>) {
    if (
      part.type !== PartType.ELEMENT ||
      !(part.element instanceof HTMLAnchorElement)
    ) {
      throw new Error("LinkDirective must be used on an anchor element");
    }

    this.attachListener(part, routerController);

    return noChange;
  }

  linkHandler(navigate: RouterController["navigate"]) {
    return (event: Event) => {
      event.preventDefault();
      let anchor = event
        .composedPath()
        .find((t): t is HTMLAnchorElement => t instanceof HTMLAnchorElement);

      if (anchor === undefined) {
        throw new Error(
          "(link handler) event must have an anchor element in its composed path."
        );
      }
      navigate(new URL(anchor.href).pathname);
    };
  }
}

export class FormDirective extends Directive {
  constructor(partInfo: PartInfo) {
    super(partInfo);

    if (partInfo.type !== PartType.ELEMENT) {
      throw new Error("FormDirective must be used on a form element");
    }
  }

  render(
    _routerController: _RouterController,
    _replace: boolean,
    _fetcherKey: string | null,
    _routeId: string | null
  ) {
    return noChange;
  }

  update(
    part: Part,
    [routerController, replace, fetcherKey, routeId]: DirectiveParameters<this>
  ) {
    if (
      part.type !== PartType.ELEMENT ||
      !(part.element instanceof HTMLFormElement)
    ) {
      throw new Error("FormDirective must be used on an form element");
    }

    part.element.addEventListener(
      "submit",
      this.handleSubmit(
        part.element,
        routerController,
        replace,
        fetcherKey,
        routeId
      )
    );
  }

  handleSubmit(
    form: HTMLFormElement,
    routerController: _RouterController,
    replace: boolean,
    fetcherKey: string | null,
    routeId: string | null
  ) {
    return (event: SubmitEvent) => {
      if (event.defaultPrevented) {
        return;
      }
      event.preventDefault();
      submitImpl(
        routerController.routerContext.router,
        routerController.formAction(form.action),
        (event.submitter as HTMLFormSubmitter) || event.currentTarget,
        {
          method: form.method as FormMethod,
          replace: replace,
        },
        fetcherKey ?? undefined,
        routeId ?? undefined
      );
    };
  }
}

function enhanceManualRouteObjects(routes: RouteObject[]): RouteObject[] {
  return routes.map((route) => {
    let routeClone = { ...route };
    if (routeClone.hasErrorBoundary == null) {
      routeClone.hasErrorBoundary = routeClone.errorElement != null;
    }
    if (routeClone.children) {
      routeClone.children = enhanceManualRouteObjects(routeClone.children);
    }
    return routeClone;
  });
}

function submitImpl(
  router: Router,
  defaultAction: string,
  target: SubmitTarget,
  options: SubmitOptions = {},
  fetcherKey?: string,
  routeId?: string
): void {
  if (typeof document === "undefined") {
    throw new Error("Unable to submit during server render");
  }

  let { method, encType, formData, url } = getFormSubmissionInfo(
    target,
    defaultAction,
    options
  );

  let href = url.pathname + url.search;
  let opts = {
    replace: options.replace,
    formData,
    formMethod: method as FormMethod,
    formEncType: encType as FormEncType,
  };
  if (fetcherKey && routeId) {
    router.fetch(fetcherKey, routeId, href, opts as any);
  } else {
    router.navigate(href, opts);
  }
}

function getPathContributingMatches(matches: DataRouteMatch[]) {
  // Ignore index + pathless matches
  return matches.filter(
    (match, index) =>
      index === 0 ||
      (!match.route.index &&
        match.pathnameBase !== matches[index - 1].pathnameBase)
  );
}

function createPath({ pathname = "/", search = "", hash = "" }: Partial<Path>) {
  if (search && search !== "?")
    pathname += search.charAt(0) === "?" ? search : "?" + search;
  if (hash && hash !== "#")
    pathname += hash.charAt(0) === "#" ? hash : "#" + hash;
  return pathname;
}

function createURL(router: Router, location: Location | string): URL {
  let base =
    typeof window !== "undefined" && typeof window.location !== "undefined"
      ? window.location.origin
      : "unknown://unknown";
  let href =
    typeof location === "string" ? location : router.createHref(location);
  return new URL(href, base);
}
