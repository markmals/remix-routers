# remix-router-lit

Lit/web components implementation of the `react-router-dom` API (driven by `@remix-run/router`)

> **Warning**
>
> This project is in an early stage so use with caution!

## Installation

```bash
npm install remix-router-lit
```

## Notable API Differences

- All hook-like functionality is available on a [reactive controller][reactive-controller] object called `RouterController`.
- `<Link>`, `<Form>`, and `<fetcher.Form>` are directives in Lit called `RouterController.enhanceLink()`, `RouterController.enhanceForm()`, and `RouterController.fetcher.enhanceForm()`, respectively.
- `<Await>` is a directive in Lit called `RouterController.await()`

## Example Usage

Please refer to the [docs for `react-router`][rr-docs] for reference on the APIs in question, but the following is a simple example of how to leverage `remix-router-lit` in a Lit application. You may also refer to the [reference application][reference-app] for a more extensive usage example.

**app.ts**

```ts
import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { createBrowserRouter } from "remix-router-lit";

import "./layout.ts"
import "./index.ts"

@customElement("app-main")
export class App extends LitElement {
  // Define your routes in a nested array, providing loaders and actions where
  // appropriate
  routes = [
    {
      path: "/",
      element: "app-layout",
      children: [
        {
          index: true,
          loader: indexLoader,
          element: "app-index",
        },
      ],
    },
  ];

  // Create a router from your routes
  router = createBrowserRouter(this.routes);
  // Provide a fallbackElement to be displayed during the initial data load
  fallback = html`<p>Loading...</p>`;

  render() {
    return html`
      <remix-router-provider
        .router=${this.router}
        .fallback=${this.fallback}
      ></remix-router-provider>
    `;
  }
}
```

**layout.ts**

```ts
import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { RouterController } from "remix-router-lit";

@customElement("app-layout")
export class Layout extends LitElement {
  router = new RouterController(this);

  render() {
    return html`
      <!-- Render global-layout stuff here, such as a header and nav bar -->
      <h1>Welcome to my Lit Application!</h1>
      <nav>
        <a href="/child" ${this.router.enhanceLink()}>Go to Child</a>
        <!-- more nav links -->
      </nav>

      <!-- Render matching child routes via <remix-outlet> -->
      <remix-outlet></remix-outlet>
    `;
  }
}
```

**index.ts**

```ts
import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { RouterController } from "remix-router-lit";

export async function loader() {
  // Load your data here and return whatever you need access to in the UI
  return {
    /* ... */
  };
}

@customElement("app-index")
export class Index extends LitElement {
  router = new RouterController(this);

  get data() {
    // Use the loaderData method on the RouterController reactive controller
    // to access the data returned from your loader
    return this.router.loaderData();
  }

  render() {
    return html`
      <p>Check out my data!</p>
      <pre>${this.data}</pre>
    `;
  }
}
```

[reactive-controller]: https://lit.dev/docs/composition/controllers
[rr-docs]: https://reactrouter.com/en/main
[reference-app]: ./reference-app
