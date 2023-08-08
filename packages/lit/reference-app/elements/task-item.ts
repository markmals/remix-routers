import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { RouterController } from "remix-router-lit";
import { Task } from "../tasks";

@customElement("app-task-item")
export class TaskItem extends LitElement {
  private router = new RouterController(this);

  @property({ attribute: false })
  public task!: Task;

  get fetcher() {
    return this.router.fetcher();
  }

  get isDeleting() {
    return this.fetcher.formData != null;
  }

  render() {
    return html`
      <span>${this.task.task}</span>
      &nbsp;
      <a href=${`/tasks/${this.task.id}`} ${this.router.enhanceLink()}>Open</a>
      &nbsp;

      <form
        ${this.fetcher.enhanceForm()}
        style="display: inline"
        action="/tasks"
        method="post"
      >
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
