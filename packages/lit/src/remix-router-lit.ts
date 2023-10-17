import { ContextConsumer, ContextProvider, createContext } from "@lit/context";
import type {
  AgnosticIndexRouteObject,
  AgnosticNonIndexRouteObject,
  AgnosticRouteMatch,
  FormEncType,
  FormMethod,
  HydrationState,
  LazyRouteFunction,
  Location,
  Navigation,
  Action as NavigationType,
  Path,
  RelativeRoutingType,
  Fetcher as RemixFetcher,
  Router as RemixRouter,
  RouterState,
  To,
} from "@remix-run/router";
import {
  AbortedDeferredError,
  createBrowserHistory,
  createHashHistory,
  createMemoryHistory,
  createRouter,
  isRouteErrorResponse,
  resolveTo,
} from "@remix-run/router";
import type {
  Part,
  ReactiveController,
  ReactiveElement,
  TemplateResult,
} from "lit";
import { LitElement, css, html, noChange, nothing } from "lit";
import type {
  DirectiveParameters,
  DirectiveResult,
  PartInfo,
} from "lit/async-directive.js";
import { AsyncDirective, PartType, directive } from "lit/async-directive.js";
import { customElement, property, state } from "lit/decorators.js";
import { UntilDirective, until } from "lit/directives/until.js";
import { when } from "lit/directives/when.js";
import invariant from "tiny-invariant";
import type { SubmitOptions } from "./dom";
import { getFormSubmissionInfo } from "./dom";

// TODO: class Fetcher extends ReactiveController
// TODO: enhanceNavLink(options: { isActive?: string, isPending?: string })

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
  template?: () => TemplateResult | null;
  errorTemplate?: () => TemplateResult | null;
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
  template?: () => TemplateResult | null;
  errorTemplate?: () => TemplateResult | null;
  lazy?: LazyRouteFunction<RouteObject>;
}

export type RouteObject = IndexRouteObject | NonIndexRouteObject;

export type DataRouteObject = RouteObject & {
  children?: DataRouteObject[];
  id: string;
};

export type RouteMatch<
  ParamKey extends string = string,
  RouteObjectType extends RouteObject = RouteObject,
> = AgnosticRouteMatch<ParamKey, RouteObjectType>;

export type DataRouteMatch = RouteMatch<string, DataRouteObject>;

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

export type FetcherWithDirective<TData = unknown> = RemixFetcher<TData> & {
  submit(
    target:
      | HTMLFormElement
      | HTMLButtonElement
      | HTMLInputElement
      | FormData
      | URLSearchParams
      | { [name: string]: string }
      | null,
    options?: SubmitOptions,
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

export interface SubmitFunction {
  (
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
    options?: SubmitOptions,
  ): void;
}

export type HTMLFormSubmitter = HTMLButtonElement | HTMLInputElement;

export interface NavigateFunction {
  (to: To, options?: NavigateOptions): void;
  (delta: number): void;
}

// Wrapper context holding the route location in the current hierarchy
export interface IRouteContext {
  matches: DataRouteMatch[];
  index: boolean;
}

export const routerContext = createContext<RemixRouter>(
  Symbol("router-context"),
);
export const routerStateContext = createContext<RouterState>(
  Symbol("router-state-context"),
);
export const routeContext = createContext<IRouteContext>(
  Symbol("route-context"),
);
export const routeIdContext = createContext<string>(Symbol("route-id-context"));
export const routeErrorContext = createContext<unknown>(
  Symbol("route-error-context"),
);

class LinkDirective extends AsyncDirective {
  element?: HTMLAnchorElement = undefined;
  #currentHandler?: (event: Event) => void;

  constructor(partInfo: PartInfo) {
    super(partInfo);

    if (partInfo.type !== PartType.ELEMENT) {
      throw new Error("LinkDirective must be used on an anchor element");
    }
  }

  render(_navigate: NavigateFunction) {
    return noChange;
  }

  #updateFromLit = false;
  update(part: Part, [navigate]: DirectiveParameters<this>) {
    if (!this.#updateFromLit) {
      if (
        part.type !== PartType.ELEMENT ||
        !(part.element instanceof HTMLAnchorElement)
      ) {
        throw new Error("LinkDirective must be used on an anchor element");
      }

      this.element = part.element;
      this.#currentHandler = this.linkHandler(navigate);
      this.element.addEventListener("click", this.#currentHandler);
      this.#updateFromLit = true;
    }
  }

  disconnected() {
    if (this.element && this.#currentHandler) {
      this.element.removeEventListener("click", this.#currentHandler);
    }
  }

  reconnected() {
    this.#updateFromLit = false;
  }

  linkHandler(navigate: NavigateFunction) {
    return (event: Event) => {
      event.preventDefault();
      let anchor = event
        .composedPath()
        .find((t): t is HTMLAnchorElement => t instanceof HTMLAnchorElement);

      if (anchor === undefined) {
        throw new Error(
          "(link handler) event must have an anchor element in its composed path.",
        );
      }
      navigate(new URL(anchor.href).pathname);
    };
  }
}

export type { LinkDirective };

const link = directive(LinkDirective);

// class NavLinkDirective extends LinkDirective {
//   render(navigate: NavigateFunction, _isActive?: string, _isPending?: string) {
//     return super.render(navigate);
//   }

//   previousActiveClasses: string = "";
//   previousPendingClasses: string = "";

//   update(
//     part: Part,
//     [navigate, isActive, isPending]: DirectiveParameters<this>,
//   ) {
//     super.update(part, [navigate]);

//     if (isActive) {
//       this.element?.classList.add(isActive);
//       this.previousActiveClasses = isActive;
//     } else {
//       this.element?.classList.remove(this.previousActiveClasses);
//     }

//     if (isPending) {
//       this.element?.classList.add(isPending);
//       this.previousActiveClasses = isPending;
//     } else {
//       this.element?.classList.remove(this.previousPendingClasses);
//     }
//   }
// }

// export type { NavLinkDirective };

// const navLink = directive(NavLinkDirective);

class FormDirective extends AsyncDirective {
  #part?: Part = undefined;

  constructor(partInfo: PartInfo) {
    super(partInfo);

    if (partInfo.type !== PartType.ELEMENT) {
      throw new Error("FormDirective must be used on a form element");
    }
  }

  render(
    _router: Router,
    _remixRouter: RemixRouter,
    _replace: boolean,
    _fetcherKey: string | null,
    _routeId: string | null,
  ) {
    return noChange;
  }

  updateFromLit = false;
  update(
    part: Part,
    [
      controller,
      routerContext,
      replace,
      fetcherKey,
      routeId,
    ]: DirectiveParameters<this>,
  ) {
    this.#part = part;

    if (
      this.#part.type !== PartType.ELEMENT ||
      !(this.#part.element instanceof HTMLFormElement)
    ) {
      throw new Error("FormDirective must be used on a form element");
    }

    if (!this.updateFromLit) {
      this.#part.element.addEventListener(
        "submit",
        this.handleSubmit(
          this.#part.element,
          controller,
          routerContext,
          replace,
          fetcherKey,
          routeId,
        ),
      );
      this.updateFromLit = true;
    }
  }

  handleSubmit(
    form: HTMLFormElement,
    router: Router,
    remixRouter: RemixRouter,
    replace: boolean,
    fetcherKey: string | null,
    routeId: string | null,
  ): (event: any) => void {
    return (event: SubmitEvent & { submitter: HTMLFormSubmitter }) => {
      if (event.defaultPrevented) {
        return;
      }
      event.preventDefault();

      // FIXME: I couldn't figure out the right way to do this
      // console.log(form.action);
      let resolvedAction = form.action;
      try {
        let url = new URL(resolvedAction);
        resolvedAction = url.pathname;
      } catch {}

      submitImpl(
        remixRouter,
        router.formAction(resolvedAction, { relative: "route" }),
        event.submitter || event.currentTarget,
        {
          method: form.method as FormMethod,
          replace: replace,
        },
        fetcherKey ?? undefined,
        routeId ?? undefined,
      );
    };
  }
}

export type { FormDirective };

const form = directive(FormDirective);

@customElement("remix-route")
export class RouteWrapper extends LitElement {
  static styles = [
    css`
      :host {
        display: contents;
      }
    `,
  ];

  @state() _routeId!: string;

  get routeId() {
    return this._routeId;
  }

  @property({ attribute: false })
  set routeId(newValue: string) {
    this._routeId = newValue;
    this.#routeIdProvider.setValue(newValue);
  }

  @property({ attribute: false })
  match!: DataRouteMatch;

  @property({ attribute: false })
  routeError!: unknown;

  @state()
  _error: unknown;

  get error() {
    return this._error;
  }

  @property({ attribute: false })
  set error(newValue: unknown) {
    this._error = newValue;
    this.#errorProvider.setValue(newValue);
  }

  @property({ attribute: false })
  root!: boolean;

  #router = new Router(this);

  #routeIdProvider = new ContextProvider(this, { context: routeIdContext });
  #routeProvider = new ContextProvider(this, { context: routeContext });
  #errorProvider = new ContextProvider(this, { context: routeErrorContext });

  #errorCallback = (event: ErrorEvent) => {
    // event.preventDefault();
    this.error = event.error;
    // console.error(this.error);
  };

  #rejectionCallback = (event: PromiseRejectionEvent) => {
    // event.preventDefault();
    this.error = event.reason;
    // console.error(this.error);
  };

  get index() {
    return this.match.route.index === true;
  }

  get routeMatches() {
    return this.#router.routeMatches(this.routeId);
  }

  connectedCallback() {
    super.connectedCallback();
    this.#routeIdProvider.setValue(this.routeId);
    this.#routeProvider.setValue({
      index: this.index,
      matches: this.routeMatches,
    });

    window.addEventListener("error", this.#errorCallback);
    window.addEventListener("unhandledrejection", this.#rejectionCallback);

    this.#errorProvider.setValue(this.error);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("error", this.#errorCallback);
    window.removeEventListener("unhandledrejection", this.#rejectionCallback);
  }

  render() {
    return when(
      this.root || this.error || this.match.route.errorTemplate?.(),
      () =>
        when(
          this.error,
          () =>
            this.match.route.errorTemplate?.() ||
            defaultErrorTemplate(this.routeError),
          () => this.match.route.template?.(),
        ),
      () => this.match.route.template?.(),
    );
  }
}

const defaultErrorTemplate = (routeError: unknown) => {
  const message = () => {
    const err = routeError;
    return isRouteErrorResponse(err)
      ? `${err.status} ${err.statusText}`
      : err instanceof Error
      ? err.message
      : JSON.stringify(err);
  };

  const stack = () => {
    const err = routeError;
    return err instanceof Error ? err.stack : undefined;
  };

  const lightgrey = "rgba(200,200,200, 0.5)";
  const preStyles = `padding: 0.5rem; background-color: ${lightgrey}`;
  const codeStyles = `padding: 2px 4px; background-color: ${lightgrey}`;

  return html`
    <h2>Unhandled Thrown Error!</h2>
    <h3 style="font-style: italic">${message()}</h3>
    <!-- FIXME: This error stack is never showing up -->
    ${stack() ? html`<pre style="${preStyles}">${stack()}</pre>` : nothing}
    <p>💿 Hey developer 👋</p>
    <p>
      You can provide a way better UX than this when your app throws errors by
      providing your own <code style="${codeStyles}">ErrorBoundary</code> props
      on your routes.
    </p>
  `;
};

let fetcherId = 0;

// FIXME: Element using Router scheduled an update after an update completed, causing a
// new update to be scheduled. This is inefficient and should be avoided unless the next
// update can only be scheduled as a side effect of the previous update. See
// https://lit.dev/msg/change-in-update for more information.

export class Router implements ReactiveController {
  #host;

  #routerConsumer;
  #routeConsumer;

  #routerStateConsumer;
  #routeIdConsumer;
  #routeErrorConsumer;

  #disposables: (() => void)[] = [];
  #onCleanup(cleanupFunc: () => void) {
    this.#disposables.push(cleanupFunc);
  }

  constructor(host: ReactiveElement) {
    this.#host = host;
    host.addController(this);

    this.#routerConsumer = new ContextConsumer(host, {
      context: routerContext,
    });
    this.#routeConsumer = new ContextConsumer(host, { context: routeContext });

    this.#routerStateConsumer = new ContextConsumer(host, {
      context: routerStateContext,
      subscribe: true,
    });

    this.#routeIdConsumer = new ContextConsumer(host, {
      context: routeIdContext,
      subscribe: true,
    });

    this.#routeErrorConsumer = new ContextConsumer(host, {
      context: routeErrorContext,
      subscribe: true,
    });
  }

  hostDisconnected() {
    for (let fetcherKey of this.#fetcherKeys) {
      this.#router.deleteFetcher(fetcherKey);
    }
  }

  get #router(): RemixRouter {
    invariant(this.#routerConsumer.value, "No RouterContext available");
    return this.#routerConsumer.value;
  }

  get #state(): RouterState {
    invariant(
      this.#routerStateConsumer.value,
      "No RouterStateContext available",
    );
    return this.#routerStateConsumer.value;
  }

  get #routeId(): string {
    invariant(this.#routeIdConsumer.value, "No RouteIdContext available");
    return this.#routeIdConsumer.value;
  }

  get #routeContext(): IRouteContext {
    invariant(this.#routeConsumer.value, "No RouteContext available");
    return this.#routeConsumer.value;
  }

  get routeError(): unknown {
    return (
      this.#routeErrorConsumer.value || this.#state.errors?.[this.#routeId]
    );
  }

  get navigationType(): NavigationType {
    return this.#state.historyAction;
  }

  get location(): Location {
    return this.#state.location;
  }

  get matches() {
    return this.#state.matches.map((match) => ({
      id: match.route.id,
      pathname: match.pathname,
      params: match.params,
      data: this.#state.loaderData[match.route.id] as unknown,
      handle: match.route.handle as unknown,
    }));
  }

  get navigation(): Navigation {
    return this.#state.navigation;
  }

  routeLoaderData = (routeId: string): unknown => {
    return this.#state.loaderData[routeId];
  };

  get loaderData(): unknown {
    return this.routeLoaderData(this.#routeId);
  }

  get actionData(): unknown {
    return this.#state.actionData?.[this.#routeId];
  }

  resolvedPath = (
    to: To,
    { relative }: { relative?: RelativeRoutingType } = {},
  ): Path =>
    resolveTo(
      to,
      getPathContributingMatches(this.#routeContext.matches).map(
        (match) => match.pathnameBase,
      ),
      this.location.pathname,
      relative === "path",
    );

  href = (to: To): string =>
    this.#router.createHref(
      createURL(this.#router, createPath(this.resolvedPath(to))),
    );

  navigate = (to: To | number, options: NavigateOptions = {}) => {
    if (typeof to === "number") {
      this.#router.navigate(to);
      return;
    }

    let path = resolveTo(
      to,
      getPathContributingMatches(this.#routeContext.matches).map(
        (match) => match.pathnameBase,
      ),
      this.location.pathname,
    );

    this.#router.navigate(path, {
      replace: options.replace,
      state: options.state,
    });
  };

  enhanceLink = () => {
    return link(this.navigate);
  };

  isActive = (to: To) => {
    let path = this.resolvedPath(to);
    let toPathname = path.pathname;

    let locationPathname = this.location.pathname;

    return (
      locationPathname === toPathname ||
      (locationPathname.startsWith(toPathname) &&
        locationPathname.charAt(toPathname.length) === "/")
    );
  };

  isPending = (to: To) => {
    let path = this.resolvedPath(to);
    let toPathname = path.pathname;

    let nextLocationPathname =
      this.navigation && this.navigation.location
        ? this.navigation.location.pathname
        : null;

    return (
      nextLocationPathname != null &&
      (nextLocationPathname === toPathname ||
        (nextLocationPathname.startsWith(toPathname) &&
          nextLocationPathname.charAt(toPathname.length) === "/")) &&
      !this.isActive(to)
    );
  };

  formAction = (
    action = ".",
    { relative }: { relative?: RelativeRoutingType } = {},
  ): string => {
    let route = this.#routeContext;
    let path = this.resolvedPath(action, { relative });

    let search = path.search;
    if (action === "." && route.index) {
      search = search ? search.replace(/^\?/, "?index&") : "?index";
    }

    return path.pathname + search;
  };

  submit: SubmitFunction = (target, options = {}) => {
    submitImpl(this.#router, this.formAction(), target, options);
  };

  enhanceForm = (options: { replace: boolean } = { replace: false }) => {
    return form(this, this.#router, options.replace, null, null);
  };

  #fetcherKeys: string[] = [];
  getFetcher = <TData = unknown>(): FetcherWithDirective<TData> => {
    const defaultAction = this.formAction();
    const fetcherKey = String(++fetcherId);
    this.#fetcherKeys.push(fetcherKey);

    let fetcher = this.#router.getFetcher<TData>(fetcherKey);

    this.#router.subscribe(() => {
      fetcher = this.#router.getFetcher<TData>(fetcherKey);
      this.#host.requestUpdate();
    });

    return {
      get state() {
        return fetcher.state;
      },
      get formMethod() {
        return fetcher.formMethod;
      },
      get formAction() {
        return fetcher.formAction;
      },
      get formEncType() {
        return fetcher.formEncType;
      },
      get text() {
        return fetcher.text;
      },
      get formData() {
        return fetcher.formData;
      },
      get json() {
        return fetcher.json;
      },
      get data() {
        return fetcher.data;
      },
      enhanceForm: (options = { replace: false }) => {
        return form(
          this,
          this.#router,
          options.replace,
          fetcherKey,
          this.#routeId,
        );
      },
      submit: (target, options = {}) => {
        return submitImpl(
          this.#router,
          defaultAction,
          target,
          options,
          fetcherKey,
          this.#routeId,
        );
      },
      load: (href) => {
        return this.#router.fetch(fetcherKey, this.#routeId, href);
      },
    } as FetcherWithDirective<TData>;
  };

  await = <T>(
    task: Promise<T> | T | undefined,
    options: {
      pending?: () => TemplateResult;
      complete: (value: T) => TemplateResult;
      error?: (error: unknown) => TemplateResult;
    },
  ): DirectiveResult<typeof UntilDirective> => {
    const resolve = async () => {
      if (task === undefined) return options.pending?.() ?? html``;

      try {
        let promise: Promise<T> =
          task instanceof Promise ? task : Promise.resolve(task as T);
        let value = await promise;
        return options.complete(value);
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
          return options.error(error);
        } else {
          throw error;
        }
      }
    };

    return until(resolve(), options.pending?.());
  };

  outlet = () =>
    outletImpl({
      state: this.#state,
      routeId: this.#routeId,
      routeError: this.routeError,
    });

  /** @private */
  routeMatches(id: string): DataRouteMatch[] {
    return this.#state.matches.slice(
      0,
      this.#state.matches.findIndex((m) => m.route.id === id) + 1,
    );
  }
}

export class RouterProvider implements ReactiveController {
  #state: RouterState;
  #unsubscribe: () => void;
  #fallback?: TemplateResult;

  constructor(
    host: ReactiveElement,
    router: RemixRouter,
    fallback?: TemplateResult,
  ) {
    host.addController(this);

    const routerProvider = new ContextProvider(host, {
      context: routerContext,
    });
    const stateProvider = new ContextProvider(host, {
      context: routerStateContext,
    });

    routerProvider.setValue(router);

    this.#state = router.state;
    stateProvider.setValue(router.state);

    this.#unsubscribe = router.subscribe((state) => {
      this.#state = state;
      stateProvider.setValue(state);
      host.requestUpdate();
    });

    this.#fallback = fallback;
  }

  hostDisconnected() {
    this.#unsubscribe();
  }

  render() {
    if (!this.#state.initialized) {
      return this.#fallback ? this.#fallback : html`<span></span>`;
    }

    return outletImpl({ state: this.#state, root: true });
  }
}

function outletImpl({
  routeId,
  state,
  routeError,
  root = false,
}: {
  routeId?: string;
  state: RouterState;
  routeError?: unknown;
  root?: boolean;
}): TemplateResult {
  const id = root ? null : routeId;
  const idx = state.matches.findIndex((m) => m.route.id === id);
  const matchToRender = state.matches[idx + 1];
  const error = (
    state.errors?.[matchToRender.route.id] != null
      ? Object.values(state.errors)[0]
      : null
  ) as unknown;
  const match = matchToRender as DataRouteMatch;

  if (idx < 0 && !root) {
    throw new Error(
      `Unable to find outlet match for route id: ${id || "_root_"}`,
    );
  }

  return html`
    ${when(
      match,
      () => html`
        <remix-route
          .routeId="${state.matches[idx + 1]?.route.id}"
          .match="${match}"
          .routeError="${routeError}"
          .error="${error}"
          .root="${root}"
        ></remix-route>
      `,
      () =>
        // We found an outlet() but do not have deeper matching paths so we
        // end the render tree here
        nothing,
    )}
  `;
}

export function createMemoryRouter(
  routes: RouteObject[],
  {
    basename,
    hydrationData,
    initialEntries,
    initialIndex,
  }: CreateMemoryRouterOpts = {},
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
  { basename, hydrationData, window }: CreateBrowserRouterOpts = {},
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
  { basename, hydrationData, window }: CreateHashRouterOpts = {},
) {
  return createRouter({
    basename,
    history: createHashHistory({ window }),
    hydrationData,
    routes: enhanceManualRouteObjects(routes),
  }).initialize();
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

function submitImpl(
  router: RemixRouter,
  defaultAction: string,
  target: SubmitTarget,
  options: SubmitOptions = {},
  fetcherKey?: string,
  routeId?: string,
): void {
  if (typeof document === "undefined") {
    throw new Error("Unable to submit during server render");
  }

  let { method, encType, formData, url } = getFormSubmissionInfo(
    target,
    defaultAction,
    options,
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
        match.pathnameBase !== matches[index - 1].pathnameBase),
  );
}

function createPath({ pathname = "/", search = "", hash = "" }: Partial<Path>) {
  if (search && search !== "?")
    pathname += search.charAt(0) === "?" ? search : "?" + search;
  if (hash && hash !== "#")
    pathname += hash.charAt(0) === "#" ? hash : "#" + hash;
  return pathname;
}

function createURL(router: RemixRouter, location: Location | string): URL {
  let base =
    typeof window !== "undefined" && typeof window.location !== "undefined"
      ? window.location.origin
      : "unknown://unknown";
  let href =
    typeof location === "string" ? location : router.createHref(location);
  return new URL(href, base);
}
