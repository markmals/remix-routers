import { nothing, html } from "lit";
// import { when } from 'lit/directives/when.js';
import { RouterContext, RouteContext, DataRouteMatch } from ".";
import { when } from "lit/directives/when.js";

export function outletImpl(options: {
  routerContext: RouterContext;
  routeContext: RouteContext;
}): any;
export function outletImpl(options: {
  routerContext: RouterContext;
  root: true;
}): any;
export function outletImpl({
  routerContext,
  routeContext: routeCtx,
  root = false,
}: {
  routerContext: RouterContext;
  routeContext?: RouteContext;
  root?: boolean;
}) {
  let router = routerContext?.router;
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
  let error: unknown =
    router.state.errors?.[matchToRender.route.id] != null
      ? Object.values(router.state.errors)[0]
      : null;

  return html`
    <route-wrapper
      .id="${matchToRender.route.id}"
      .index="${matchToRender.route.index === true}"
    >
      ${when(
        root || error || matchToRender.route.errorTemplate,
        () => html`
          <route-error-boundary
            .error=${error}
            .template=${matchToRender!.route.errorTemplate || "Default Error"}
          >
            ${matchToRender!.route.template}
          </route-error-boundary>
        `,
        () => matchToRender!.route.template
      )}
    </route-wrapper>
  `;
}
