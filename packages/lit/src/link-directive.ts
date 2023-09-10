import { noChange, ElementPart, Part } from "lit";
import {
  Directive,
  PartInfo,
  PartType,
  DirectiveParameters,
} from "lit/async-directive.js";
import { NavigateFunction, Router } from "..";

export class LinkDirective extends Directive {
  constructor(partInfo: PartInfo) {
    super(partInfo);

    if (partInfo.type !== PartType.ELEMENT) {
      throw new Error("LinkDirective must be used on an anchor element");
    }
  }

  render(_router: Router) {
    return noChange;
  }

  update(part: Part, [router]: DirectiveParameters<this>) {
    if (
      part.type !== PartType.ELEMENT ||
      !(part.element instanceof HTMLAnchorElement)
    ) {
      throw new Error("LinkDirective must be used on an anchor element");
    }

    this.attachListener(part, router);

    return noChange;
  }

  private isAttached = false;
  private attachListener(part: ElementPart, router: Router) {
    if (!this.isAttached) {
      const navigate = router.navigate;
      part.element.addEventListener("click", this.linkHandler(navigate));
      this.isAttached = true;
    }
    // FIXME: Figure out how to clean this listener up
    // part.element.removeEventListener("click", handler)
  }

  private linkHandler(navigate: NavigateFunction) {
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
