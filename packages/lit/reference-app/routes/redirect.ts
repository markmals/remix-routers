import { LitElement, html } from "lit"
import { customElement } from "lit/decorators.js"

import { LoaderFunctionArgs, redirect } from "@remix-run/router"
import { sleep } from "../utils"

export async function loader({ request }: LoaderFunctionArgs) {
    await sleep()
    let location = new URL(request.url).searchParams.get("location") || "/"
    return redirect(location)
}

@customElement("app-redirect")
export class Redirect extends LitElement {
    render = () => html`<h2>Shouldn't see me</h2>`
}
