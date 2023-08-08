import { LitElement, html } from "lit"
import { customElement } from "lit/decorators.js"

@customElement("app-index")
export class Index extends LitElement {
    render = () => html`<h2>Index Page</h2>`
}
