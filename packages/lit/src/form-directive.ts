import { FormMethod } from "@remix-run/router";
import { ElementPart, noChange, Part } from "lit";
import {
  Directive,
  PartInfo,
  PartType,
  DirectiveParameters,
} from "lit/async-directive.js";
import { HTMLFormSubmitter, Router, RouterContext } from "..";
import { submitImpl } from "../utils";

export class FormDirective extends Directive {
  constructor(partInfo: PartInfo) {
    super(partInfo);

    if (partInfo.type !== PartType.ELEMENT) {
      throw new Error("FormDirective must be used on a form element");
    }
  }

  render(
    _router: Router,
    _routerContext: RouterContext,
    _replace: boolean,
    _fetcherKey: string | null,
    _routeId: string | null
  ) {
    return noChange;
  }

  update(
    part: Part,
    [
      router,
      routerContext,
      replace,
      fetcherKey,
      routeId,
    ]: DirectiveParameters<this>
  ) {
    if (
      part.type !== PartType.ELEMENT ||
      !(part.element instanceof HTMLFormElement)
    ) {
      throw new Error("FormDirective must be used on a form element");
    }

    this.attachListener(
      part,
      router,
      routerContext,
      replace,
      fetcherKey,
      routeId
    );

    return noChange;
  }

  private isAttached = false;
  private attachListener(
    part: ElementPart,
    router: Router,
    routerContext: RouterContext,
    replace: boolean,
    fetcherKey: string | null,
    routeId: string | null
  ) {
    if (!this.isAttached) {
      part.element.addEventListener(
        "submit",
        this.handleSubmit(
          part.element as HTMLFormElement,
          router,
          routerContext,
          replace,
          fetcherKey,
          routeId
        )
      );
      this.isAttached = true;
    }
    // FIXME: Figure out how to clean this listener up
    // part.element.removeEventListener('submit', handler)
  }

  handleSubmit(
    form: HTMLFormElement,
    router: Router,
    routerContext: RouterContext,
    replace: boolean,
    fetcherKey: string | null,
    routeId: string | null
  ): (event: any) => void {
    return (event: SubmitEvent & { submitter: HTMLFormSubmitter }) => {
      if (event.defaultPrevented) {
        return;
      }
      event.preventDefault();
      submitImpl(
        routerContext.router,
        router.formAction(form.action),
        event.submitter || event.currentTarget,
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
