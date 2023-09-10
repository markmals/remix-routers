import { ContextConsumer } from "@lit-labs/context";
import {
  createRouter,
  createBrowserHistory,
  Navigation,
  Action as NavigationType,
  Location,
  Path,
  To,
  createPath,
  resolveTo,
  Fetcher,
  AbortedDeferredError,
} from "@remix-run/router";
import { ReactiveController, ReactiveElement, TemplateResult, html } from "lit";
import invariant from "tiny-invariant";
import { routerContext, routeContext, routeErrorContext } from "./context";
import {
  RouteObject,
  CreateBrowserRouterOpts,
  DataRouteMatch,
  NavigateFunction,
  NavigateOptions,
  SubmitTarget,
  FetcherWithDirective,
} from "./types";
import {
  createURL,
  enhanceManualRouteObjects,
  getPathContributingMatches,
  submitImpl,
} from "./utils";
import { SubmitOptions } from "./dom";
import { directive, DirectiveResult } from "lit/async-directive.js";
import { LinkDirective } from "./directives/link-directive";
import { FormDirective } from "./directives/form-directive";
import { UntilDirective, until } from "lit/directives/until.js";

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

export class Router implements ReactiveController {
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
    this.host.addController(this);

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

  private get routerContext() {
    invariant(
      this.routerConsumer.value !== undefined,
      "No RouterContext available"
    );
    return this.routerConsumer.value;
  }

  private get routeContext() {
    invariant(
      this.routeConsumer.value !== undefined,
      "No RouteContext available"
    );
    return this.routeConsumer.value;
  }

  private get routeErrorContext() {
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
    return this.directives.form(
      this,
      this.routerContext,
      options.replace,
      null,
      null
    );
  };

  // FIXME: No RouterContext available when trying to get a fetcher in a connectedCallback
  public getFetcher = <TData = unknown>(): FetcherWithDirective<TData> => {
    let { router } = this.routerContext;
    let { id } = this.routeContext;
    let defaultAction = this.formAction();
    let fetcherKey = String(++fetcherId);
    this.fetcherKeys.push(fetcherKey);

    const formDirective = directive(FormDirective);

    let fetcher = router.getFetcher<TData>(fetcherKey);

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
      get json() {
        return fetcher.json;
      },
      get data() {
        return fetcher.data;
      },
      get formData() {
        return fetcher.formData;
      },
      enhanceForm: (options: { replace: boolean } = { replace: false }) => {
        return formDirective(
          this,
          this.routerContext,
          options.replace,
          fetcherKey,
          id
        );
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
    } as FetcherWithDirective<TData>;
  };

  private fetcherKeys: string[] = [];

  public get fetchers(): Fetcher[] {
    let { state } = this.routerContext;
    return [...state.fetchers.values()];
  }

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

  hostDisconnected() {
    this.fetcherKeys.forEach((key) =>
      this.routerContext.router.deleteFetcher(key)
    );
  }
}

let fetcherId = 0;
