import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { map } from "lit/directives/map.js";
import { RouterController } from "remix-router-lit";

@customElement("app-root")
export class Root extends LitElement {
  private router = new RouterController(this);

  private readonly links = {
    Index: "/",
    Parent: "/parent",
    Child: "/parent/child",
    Redirect: "/redirect?location=%2Fparent%2Fchild",
    "Loader Error": "/error?type=loader",
    "Render Error": "/error?type=render",
    "Nested Loader Error": "/parent/error?type=loader",
    "Nested Render Error": "/parent/error?type=render",
    Defer: "/defer",
    Tasks: "/tasks",
  };

  private get properties() {
    return {
      navigationType: JSON.stringify(this.router.navigationType),
      location: JSON.stringify(this.router.location),
      navigation: JSON.stringify(this.router.navigation),
      matches: JSON.stringify(this.router.matches),
    };
  }

  render() {
    return html`
      <h1>Root Layout (Lit)</h1>
      <nav>
        ${map(
          Object.entries(this.links),
          ([text, href]) =>
            html`<a ${this.router.enhanceLink()} href="${href}">${text}</a> `,
        )}
        <button id="back" @click=${() => this.router.navigate(-1)}>
          Go Back
        </button>
      </nav>
      ${map(
        Object.entries(this.properties),
        ([k, v]) => html`
          <p>
            ${k}:
            <code id="${k}">${v}</code>
          </p>
        `,
      )}
      <remix-outlet></remix-outlet>
    `;
  }
}
