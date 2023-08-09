import { useComputed } from "@preact/signals";
import { Link, useRouteError } from "remix-router-preact-signals";

export default function Boundary() {
  let error = useRouteError<Error>();
  let message = useComputed(() => error.value.message);

  return (
    <>
      <h2>Application Error Boundary</h2>
      <p>{message}</p>
      <Link to="/">Go home</Link>
    </>
  );
}
