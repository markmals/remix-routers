import { LitElement, css, html } from "lit";
import { customElement } from "lit/decorators.js";
import { map } from "lit/directives/map.js";
import { Router } from "remix-router-lit";

@customElement("app-root")
export class Root extends LitElement {
  static styles = [
    css`
      nav {
        display: flex;
      }

      nav > * {
        margin-right: 1rem;
      }
    `,
  ];

  router = new Router(this);

  links = {
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

  get properties() {
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
      ${this.router.outlet()}
    `;
  }
}
