import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ITask } from "../tasks";
import { FetcherWithDirective, Router } from "remix-router-lit";

@customElement("app-task-item")
export class TaskItem extends LitElement {
  private router = new Router(this);

  @property({ attribute: false })
  public task!: ITask;

  fetcher!: FetcherWithDirective<any>;

  get isDeleting() {
    return this.fetcher.formData != null;
  }

  connectedCallback() {
    this.fetcher = this.router.getFetcher();
  }

  render() {
    return html`
      <span>${this.task.name}</span>
      &nbsp;
      <a href=${`/${this.task.id}`} ${this.router.enhanceLink()}>Open</a>
      &nbsp;

      <form style="display: inline" method="post" ${this.fetcher.enhanceForm()}>
        <button
          type="submit"
          name="taskId"
          value="${this.task.id}"
          ?disabled=${this.isDeleting}
        >
          ${this.isDeleting ? "Deleting..." : "❌"}
        </button>
      </form>
    `;
  }
}
