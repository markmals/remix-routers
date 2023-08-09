# remix-router-preact-signals

Preact Signals UI implementation of the `react-router-dom` API (driven by `@remix-run/router`)

> **Warning**
>
> This project is in an early stage so use with caution!

## Installation

```bash
npm install remix-router-preact-signals

# or

yarn add remix-router-preact-signals
```

## Notable API Differences

- All stateful hooks return `ReadonlySignal<T>` instead of `T`
- `<Await>` is not currently implemented

## Example Usage

Please refer to the [docs for `react-router`][rr-docs] for reference on the APIs in question, but the following is a simple example of how to leverage `remix-router-preact-signals` in a Preact application. You may also refer to the [reference application][reference-app] for a more extensive usage example.

**App.tsx**

```tsx
import {
  createBrowserRouter,
  RouterProvider,
} from "remix-router-preact-signals";
import Layout from "./Layout";
import Index, { loader as indexLoader } from "./Index";

// Define your routes in a nested array, providing loaders and actions where
// appropriate
let routes = [
  {
    path: "/",
    Component: Layout,
    children: [
      {
        index: true,
        loader: indexLoader,
        Component: Index,
      },
    ],
  },
];

// Create a router from your routes
let router = createBrowserRouter(routes);

export function App() {
  // Provide a fallbackElement to be displayed during the initial data load
  return <RouterProvider router={router} fallbackElement={<p>Loading...</p>} />;
}
```

**Layout.tsx**

```tsx
import { Outlet } from "remix-router-preact-signals";

export default function Layout() {
  return (
    <>
      {/* Render global-layout stuff here, such as a header and nav bar */}
      <h1>Welcome to my Preact Application!</h1>
      <nav>{/* nav links */}</nav>

      {/* Render matching child routes via <Outlet /> */}
      <Outlet />
    </>
  );
}
```

**Index.tsx**

```tsx
import { useLoaderData } from "remix-router-preact-signals";

export async function loader() {
  // Load your data here and return whatever you need access to in the UI
  return {
    /* ... */
  };
}

export default function Index() {
  // Use the useLoaderData hook to access the data returned from your loader
  let data = useLoaderData();

  return (
    <>
      <p>Check out my data!</p>
      <pre>{data}</pre>
    </>
  );
}
```

[rr-docs]: https://reactrouter.com/en/main
[reference-app]: ./reference-app/
