import type { LoaderFunction } from "@remix-run/router";
import { json, useLoaderData } from "remix-router-preact-signals";

export const loader: LoaderFunction = async ({ request }) => {
  let isLoaderError =
    new URL(request.url).searchParams.get("type") === "loader";
  if (isLoaderError) {
    throw new Error("Loader error!");
  }
  return json({});
};

export default function ErrorComponent() {
  let data = useLoaderData<any>();
  return <h2>Render Error: {data.value.foo.bar}</h2>;
}
