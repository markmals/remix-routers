/* eslint-disable */
import {
  Action as NavigationType,
  createBrowserHistory,
  createHashHistory,
  createMemoryHistory,
  createRouter,
  isRouteErrorResponse,
  resolveTo,
  type AgnosticRouteMatch,
  type HydrationState,
  type Location,
  type Navigation,
  type Path,
  type Router,
  type RouterState,
  type To,
  AgnosticIndexRouteObject,
  AgnosticNonIndexRouteObject,
  LazyRouteFunction,
  StaticHandlerContext,
  FormMethod,
  FormEncType,
  Fetcher,
  TrackedPromise,
  AbortedDeferredError,
} from "@remix-run/router";
import {
  useSignal,
  useComputed,
  Signal,
  type ReadonlySignal,
} from "@preact/signals";
import { useContext, useEffect, useMemo, useState } from "preact/hooks";
import {
  createContext,
  type VNode,
  FunctionComponent,
  Component,
  ComponentType,
  JSX,
  ComponentChildren,
  ComponentChild,
} from "preact";
import { PropsWithChildren } from "preact/compat";
import type { SubmitOptions } from "./dom";
import { getFormSubmissionInfo, shouldProcessLinkClick } from "./dom";
import invariant from "tiny-invariant";
import { JSXInternal } from "preact/src/jsx";

// Re-exports from remix router
export { isRouteErrorResponse, json, redirect, defer } from "@remix-run/router";
export type {
  ActionFunction,
  ActionFunctionArgs,
  LoaderFunction,
  LoaderFunctionArgs,
} from "@remix-run/router";

// MARK: Types

// Create Preact-specific types from the agnostic types in @remix-run/router to
// export from remix-router-preact-signals
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
  Component?: ComponentType | null;
  ErrorBoundary?: ComponentType | null;
  lazy?: LazyRouteFunction<RouteObject>;
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
  Component?: ComponentType | null;
  ErrorBoundary?: ComponentType | null;
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

// Global context holding the singleton router and the current state
export interface RouterContextObject {
  router: Router;
  state: Signal<RouterState>;
}

// Wrapper context holding the route location in the current hierarchy
export interface RouteContextObject {
  id: string;
  matches: DataRouteMatch[];
  index: boolean;
}

// Wrapper context holding the captured render error
export interface RouteErrorContextObject {
  error: unknown;
}

export interface DataRouterContextObject extends NavigationContextObject {
  router: Router;
  staticContext?: StaticHandlerContext;
}

interface NavigationContextObject {
  basename: string;
  navigator: Navigator;
  static: boolean;
}

// MARK: Router

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

// MARK: Hooks

const RouterContext = createContext<RouterContextObject | null>(null);
const RouteContext = createContext<RouteContextObject | null>(null);
const RouteErrorContext = createContext<RouteErrorContextObject | null>(null);
export const AwaitContext = createContext<TrackedPromise | null>(null);

function useRouterContext(): RouterContextObject {
  let ctx = useContext(RouterContext);
  invariant(ctx != null, "No RouterContext available");
  return ctx;
}

function useRouteContext(): RouteContextObject {
  let ctx = useContext(RouteContext);
  invariant(ctx != null, "No RouteContext available");
  return ctx;
}

export function useNavigationType(): ReadonlySignal<NavigationType> {
  let ctx = useRouterContext();
  return useComputed(() => ctx.state.value.historyAction);
}

export function useLocation(): ReadonlySignal<Location> {
  let ctx = useRouterContext();
  return useComputed(() => ctx.state.value.location);
}

export function useMatches() {
  let ctx = useRouterContext();
  return useComputed(() =>
    ctx.state.value.matches.map((match) => ({
      id: match.route.id,
      pathname: match.pathname,
      params: match.params,
      data: ctx.state.value.loaderData[match.route.id] as unknown,
      handle: match.route.handle as unknown,
    }))
  );
}

export function useNavigation(): ReadonlySignal<Navigation> {
  let ctx = useRouterContext();
  return useComputed(() => ctx.state.value.navigation);
}

export function useLoaderData<T = unknown>(): ReadonlySignal<T> {
  return useRouteLoaderData<T>(useRouteContext().id);
}

export function useRouteLoaderData<T = unknown>(
  routeId: string
): ReadonlySignal<T> {
  let ctx = useRouterContext();
  return useComputed(() => ctx.state.value.loaderData[routeId] as T);
}

export function useActionData<T = unknown>(): ReadonlySignal<T> {
  let ctx = useRouterContext();
  let routeId = useRouteContext().id;
  return useComputed(() => ctx.state.value.actionData?.[routeId] as T);
}

export function useRouteError<T = unknown>(): ReadonlySignal<T> {
  let ctx = useRouterContext();
  let routeId = useRouteContext().id;
  let errorCtx = useContext(RouteErrorContext);

  // If this was a render error, we put it in a RouteError context inside
  // of RenderErrorBoundary. Otherwise look for errors from our data router
  // state
  return useComputed(
    () => (errorCtx?.error || ctx.router.state.errors?.[routeId]) as T
  );
}

/**
 * Returns the happy-path data from the nearest ancestor <Await /> value
 */
export function useAsyncValue(): unknown {
  let value = useContext(AwaitContext);
  return value?._data;
}

/**
 * Returns the error from the nearest ancestor <Await /> value
 */
export function useAsyncError(): unknown {
  let value = useContext(AwaitContext);
  return value?._error;
}

export function useResolvedPath(to: To): ReadonlySignal<Path> {
  let { matches } = useRouteContext();
  let location = useLocation();

  return useComputed(() =>
    resolveTo(
      to,
      getPathContributingMatches(matches).map((match) => match.pathnameBase),
      location.value.pathname
    )
  );
}

export function useHref(to: To): ReadonlySignal<string> {
  let { router } = useRouterContext();
  let path = useResolvedPath(to);

  return useComputed(() =>
    router.createHref(createURL(router, createPath(path.value)))
  );
}

export interface NavigateOptions {
  replace?: boolean;
  state?: unknown;
}

/**
 * The interface for the navigate() function returned from useNavigate().
 */
export interface NavigateFunction {
  (to: To, options?: NavigateOptions): void;
  (delta: number): void;
}

export function useNavigate(): NavigateFunction {
  let { router } = useRouterContext();
  let { matches } = useRouteContext();
  let location = useLocation();

  let navigate: NavigateFunction = (
    to: To | number,
    options: NavigateOptions = {}
  ) => {
    if (typeof to === "number") {
      router.navigate(to);
      return;
    }

    let path = resolveTo(
      to,
      getPathContributingMatches(matches).map((match) => match.pathnameBase),
      location.value.pathname
    );

    router.navigate(path, {
      replace: options.replace,
      state: options.state,
    });
  };

  return navigate;
}

type SubmitTarget =
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
    options?: SubmitOptions
  ): void;
}

export function useFormAction(action = "."): string {
  let { matches } = useRouteContext();
  let route = useRouteContext();
  let location = useLocation();

  let path = resolveTo(
    action,
    getPathContributingMatches(matches).map((match) => match.pathnameBase),
    location.value.pathname
  );

  let search = path.search;
  if (action === "." && route.index) {
    search = search ? search.replace(/^\?/, "?index&") : "?index";
  }

  return path.pathname + search;
}

export function useSubmit(): SubmitFunction {
  let { router } = useRouterContext();
  let defaultAction = useFormAction();

  let submit: SubmitFunction = (target, options = {}) => {
    submitImpl(router, defaultAction, target, options);
  };

  return submit;
}

let fetcherId = 0;

type FetcherFormProps = PropsWithChildren<
  {
    replace?: boolean;
    onSubmit?: any;
  } & JSXInternal.HTMLAttributes<HTMLFormElement>
>;

type FetcherWithComponents<TData> = {
  fetcher: ReadonlySignal<Fetcher<TData>>;
  Form: FunctionComponent<FetcherFormProps>;
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
  load: (href: string) => void;
};

export function useFetcher<TData = unknown>(): FetcherWithComponents<TData> {
  let { router } = useRouterContext();
  let { id } = useRouteContext();
  let defaultAction = useFormAction();
  let [fetcherKey] = useState(() => String(++fetcherId));
  let fetcher = useSignal<Fetcher<TData>>(router.getFetcher<TData>(fetcherKey));

  useEffect(() => {
    let unsubscribe = router.subscribe(() => {
      fetcher.value = router.getFetcher<TData>(fetcherKey);
    });

    return () => {
      unsubscribe();
      router.deleteFetcher(fetcherKey);
    };
  }, [fetcherKey]);

  function Form({
    replace = false,
    onSubmit,
    children,
    ...props
  }: FetcherFormProps) {
    return (
      <FormImpl
        replace={replace}
        onSubmit={onSubmit}
        fetcherKey={fetcherKey}
        routeId={id}
        {...props}
      >
        {children}
      </FormImpl>
    );
  }

  return useMemo(
    () => ({
      fetcher,
      Form,
      submit(target, options = {}) {
        return submitImpl(
          router,
          defaultAction,
          target,
          options,
          fetcherKey,
          id
        );
      },
      load(href) {
        return router.fetch(fetcherKey, id, href);
      },
    }),
    [Form]
  );

  // useComputed(() => ({
  // ...fetcher.value,
  // Form,
  // submit(target, options = {}) {
  //   return submitImpl(router, defaultAction, target, options, fetcherKey, id);
  // },
  // load(href) {
  //   return router.fetch(fetcherKey, id, href);
  // },
  // }));
}

// FIXME: Should this be a computed?
export function useFetchers(): Fetcher[] {
  let { state } = useRouterContext();
  return [...state.value.fetchers.values()];
}

// MARK: Components

export namespace RouterProvider {
  export interface Props {
    router: Router;
    fallbackElement?: JSX.Element;
    hydrationData?: HydrationState;
  }
}

export function RouterProvider({
  router,
  fallbackElement,
}: RouterProvider.Props) {
  let state = useSignal<RouterState>(router.state);
  useEffect(() => {
    router.subscribe((s) => (state.value = s));
  }, []);

  return (
    <RouterContext.Provider value={{ router, state }}>
      {!state.value.initialized ? (
        !!fallbackElement ? (
          fallbackElement
        ) : (
          <span />
        )
      ) : (
        <OutletImpl root={true} />
      )}
    </RouterContext.Provider>
  );
}

namespace RouteWrapper {
  export interface Props extends PropsWithChildren {
    id: string;
    index: boolean;
  }
}

function RouteWrapper({ id, index, children }: RouteWrapper.Props) {
  let { state } = useRouterContext();
  // FIXME: I could probably memoize at least the matches with a computed
  // Would that actually realize perf gains?
  let ctx = {
    id,
    matches: state.value.matches.slice(
      0,
      state.value.matches.findIndex((m) => m.route.id === id) + 1
    ),
    index: index === true,
  };

  return <RouteContext.Provider value={ctx}>{children}</RouteContext.Provider>;
}

namespace ErrorWrapper {
  export interface Props extends PropsWithChildren {
    error: unknown;
  }
}

function ErrorWrapper({ error, children }: ErrorWrapper.Props) {
  return (
    <RouteErrorContext.Provider value={{ error }}>
      {children}
    </RouteErrorContext.Provider>
  );
}

function DefaultErrorComponent() {
  let error = useRouteError();

  let stack = useComputed<string | undefined>(() => {
    if (error.value instanceof Error) {
      return error.value.stack;
    }
  });

  let message = useComputed<string>(() => {
    if (isRouteErrorResponse(error.value)) {
      return `${error.value.status} ${error.value.statusText}`;
    } else if (error.value instanceof Error) {
      return error.value.message;
    } else {
      return JSON.stringify(error.value);
    }
  });

  let lightgrey = "rgba(200,200,200, 0.5)";
  let preStyles = { padding: "0.5rem", backgroundColor: lightgrey };
  let codeStyles = { padding: "2px 4px", backgroundColor: lightgrey };

  return (
    <>
      <h2>Unhandled Thrown Error!</h2>
      <h3 style={{ fontStyle: "italic" }}>{message}</h3>
      {stack && <pre style={preStyles}>{stack}</pre>}
      <p>💿 Hey developer 👋</p>
      <p>
        You can provide a way better UX than this when your app throws errors by
        providing your own <code style={codeStyles}>errorElement</code>
        props on your routes.
      </p>
    </>
  );
}

namespace ErrorBoundary {
  export interface Props extends PropsWithChildren {
    location: Location;
    component: ComponentType;
    error?: unknown;
  }

  export interface State {
    location: Location;
    error: any;
  }
}

export class ErrorBoundary extends Component<
  ErrorBoundary.Props,
  ErrorBoundary.State
> {
  constructor(props: ErrorBoundary.Props) {
    super(props);
    this.state = {
      location: props.location,
      error: props.error,
    };
  }

  static getDerivedStateFromError(error: any) {
    return { error: error };
  }

  static getDerivedStateFromProps(
    props: ErrorBoundary.Props,
    state: ErrorBoundary.State
  ) {
    // When we get into an error state, the user will likely click "back" to the
    // previous page that didn't have an error. Because this wraps the entire
    // application, that will have no effect--the error page continues to display.
    // This gives us a mechanism to recover from the error when the location changes.
    //
    // Whether we're in an error state or not, we update the location in state
    // so that when we are in an error state, it gets reset when a new location
    // comes in and the user recovers from the error.
    if (state.location !== props.location) {
      return {
        error: props.error,
        location: props.location,
      };
    }

    // If we're not changing locations, preserve the location but still surface
    // any new errors that may come through. We retain the existing error, we do
    // this because the error provided from the app state may be cleared without
    // the location changing.
    return {
      error: props.error || state.error,
      location: state.location,
    };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error(
      "Remix Router caught the following error during render",
      error,
      errorInfo
    );
  }

  render() {
    return this.state.error ? (
      <ErrorWrapper
        error={this.state.error}
        children={<this.props.component />}
      />
    ) : (
      this.props.children
    );
  }
}

namespace OutletImpl {
  export interface Props {
    root?: boolean;
  }
}

function OutletImpl({ root = false }: OutletImpl.Props) {
  let { state, router } = useRouterContext();
  let routeContext = root ? null : useRouteContext();

  let { matches } = router.state;
  let idx = matches.findIndex((m) => m.route.id === routeContext?.id);

  if (idx < 0 && !root) {
    throw new Error(
      `Unable to find <Outlet /> match for route id: ${
        routeContext?.id || "_root_"
      }`
    );
  }

  let matchToRender = matches[idx + 1];

  if (!matchToRender) {
    // We found an <Outlet /> but do not have deeper matching paths so we
    // end the render tree here
    return null;
  }

  // Grab the error if we've reached the correct boundary.  Type must remain
  // unknown since user's can throw anything from a loader/action.
  let error: unknown =
    router.state.errors?.[matchToRender.route.id] != null
      ? Object.values(router.state.errors)[0]
      : null;

  return renderRouteWrapper(matchToRender, state.value.location, root, error);
}

export function Outlet() {
  return <OutletImpl />;
}

export namespace Link {
  export interface Props extends JSXInternal.HTMLAttributes<HTMLAnchorElement> {
    to: string;
  }
}

export function Link({ to, children, ...props }: Link.Props) {
  const { router } = useRouterContext();

  return (
    <a
      href={to}
      onClick={(event) => {
        let target =
          typeof props.target === "string" ? props.target : undefined;
        if (!shouldProcessLinkClick(event, target)) {
          return;
        }
        event.preventDefault();
        router.navigate(to);
      }}
      children={children}
      {...props}
    />
  );
}

type HTMLFormSubmitter = HTMLButtonElement | HTMLInputElement;

namespace FormImpl {
  export interface Props extends JSXInternal.HTMLAttributes<HTMLFormElement> {
    replace?: boolean;
    fetcherKey?: string | null;
    routeId?: string | null;
  }
}

function FormImpl({
  replace = false,
  onSubmit,
  fetcherKey = null,
  routeId = null,
  ...props
}: FormImpl.Props) {
  let { router } = useRouterContext();
  let defaultAction = useFormAction(
    props.action instanceof Signal ? props.action.value : props.action
  );

  return (
    <form
      onSubmit={(event) => {
        onSubmit && onSubmit(event);
        if (event.defaultPrevented) {
          return;
        }
        event.preventDefault();
        submitImpl(
          router,
          defaultAction,
          ((event as any).submitter as HTMLFormSubmitter) ||
            event.currentTarget,
          {
            method: props.method as FormMethod,
            replace: replace,
          },
          fetcherKey ?? undefined,
          routeId ?? undefined
        );
      }}
      {...props}
    />
  );
}

export namespace Form {
  export interface Props extends JSXInternal.HTMLAttributes<HTMLFormElement> {
    replace?: boolean;
  }
}

export function Form(props: Form.Props) {
  return <FormImpl {...props} />;
}

export interface AwaitResolveRenderFunction {
  (data: Awaited<any>): any;
}

export interface AwaitProps {
  children: ComponentChildren | AwaitResolveRenderFunction;
  errorElement?: ComponentChild;
  resolve: TrackedPromise | any;
}

/**
 * Component to use for rendering lazily loaded data from returning defer()
 * in a loader function
 */
export function Await({ children, errorElement, resolve }: AwaitProps) {
  return (
    <AwaitErrorBoundary resolve={resolve} errorElement={errorElement}>
      <ResolveAwait>{children}</ResolveAwait>
    </AwaitErrorBoundary>
  );
}

type AwaitErrorBoundaryProps = {
  errorElement?: ComponentChild;
  resolve: TrackedPromise | any;
  children?: ComponentChildren;
};

type AwaitErrorBoundaryState = {
  error: any;
};

enum AwaitRenderStatus {
  pending,
  success,
  error,
}

const neverSettledPromise = new Promise(() => {});

class AwaitErrorBoundary extends Component<
  AwaitErrorBoundaryProps,
  AwaitErrorBoundaryState
> {
  constructor(props: AwaitErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error(
      "<Await> caught the following error during render",
      error,
      errorInfo
    );
  }

  render() {
    let { children, errorElement, resolve } = this.props;

    let promise: TrackedPromise | null = null;
    let status: AwaitRenderStatus = AwaitRenderStatus.pending;

    if (!(resolve instanceof Promise)) {
      // Didn't get a promise - provide as a resolved promise
      status = AwaitRenderStatus.success;
      promise = Promise.resolve();
      Object.defineProperty(promise, "_tracked", { get: () => true });
      Object.defineProperty(promise, "_data", { get: () => resolve });
    } else if (this.state.error) {
      // Caught a render error, provide it as a rejected promise
      status = AwaitRenderStatus.error;
      let renderError = this.state.error;
      promise = Promise.reject().catch(() => {}); // Avoid unhandled rejection warnings
      Object.defineProperty(promise, "_tracked", { get: () => true });
      Object.defineProperty(promise, "_error", { get: () => renderError });
    } else if ((resolve as TrackedPromise)._tracked) {
      // Already tracked promise - check contents
      promise = resolve;
      status =
        promise._error !== undefined
          ? AwaitRenderStatus.error
          : promise._data !== undefined
          ? AwaitRenderStatus.success
          : AwaitRenderStatus.pending;
    } else {
      // Raw (untracked) promise - track it
      status = AwaitRenderStatus.pending;
      Object.defineProperty(resolve, "_tracked", { get: () => true });
      promise = resolve.then(
        (data: any) =>
          Object.defineProperty(resolve, "_data", { get: () => data }),
        (error: any) =>
          Object.defineProperty(resolve, "_error", { get: () => error })
      );
    }

    if (
      status === AwaitRenderStatus.error &&
      promise._error instanceof AbortedDeferredError
    ) {
      // Freeze the UI by throwing a never resolved promise
      throw neverSettledPromise;
    }

    if (status === AwaitRenderStatus.error && !errorElement) {
      // No errorElement, throw to the nearest route-level error boundary
      throw promise._error;
    }

    if (status === AwaitRenderStatus.error) {
      // Render via our errorElement
      return <AwaitContext.Provider value={promise} children={errorElement} />;
    }

    if (status === AwaitRenderStatus.success) {
      // Render children with resolved value
      return <AwaitContext.Provider value={promise} children={children} />;
    }

    // Throw to the suspense boundary
    throw promise;
  }
}

/**
 * @private
 * Indirection to leverage useAsyncValue for a render-prop API on <Await>
 */
function ResolveAwait({
  children,
}: {
  children: ComponentChildren | AwaitResolveRenderFunction;
}) {
  let data = useAsyncValue();
  if (typeof children === "function") {
    return children(data);
  }
  return <>{children}</>;
}

// MARK: Utils

function enhanceManualRouteObjects(routes: RouteObject[]): RouteObject[] {
  return routes.map((route) => {
    let routeClone = { ...route };
    if (routeClone.hasErrorBoundary == null) {
      routeClone.hasErrorBoundary = routeClone.ErrorBoundary != null;
    }
    if (routeClone.children) {
      routeClone.children = enhanceManualRouteObjects(routeClone.children);
    }
    return routeClone;
  });
}

function renderRouteWrapper(
  match: DataRouteMatch,
  location: Location,
  root?: boolean,
  error?: unknown
): VNode {
  return (
    <RouteWrapper
      id={match.route.id}
      index={match.route.index === true}
      key={`${match.route.id}:${location.key}`}
    >
      {root || error || match.route.ErrorBoundary ? (
        <ErrorBoundary
          location={location}
          component={match.route.ErrorBoundary || DefaultErrorComponent}
          error={error}
        >
          {match.route.Component && <match.route.Component />}
        </ErrorBoundary>
      ) : (
        // Otherwise just render the element, letting render errors bubble upwards
        match.route.Component && <match.route.Component />
      )}
    </RouteWrapper>
  );
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
  } as any;
  if (fetcherKey && routeId) {
    router.fetch(fetcherKey, routeId, href, opts);
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
