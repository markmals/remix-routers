import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Task } from "../tasks";
// import { Router } from "../../src/new-router";

@customElement("app-task-item")
export class TaskItem extends LitElement {
  // private router = new Router(this);

  @property({ attribute: false })
  public task!: Task;

  // fetcher = this.router.fetcher();

  get isDeleting() {
    return false;
    // return this.fetcher.formData != null;
  }

  render() {
    return html`
      <span>${this.task.task}</span>
      &nbsp;
      <!-- this.router.enhanceLink() -->
      <a href=${`/tasks/${this.task.id}`}>Open</a>
      &nbsp;

      <!-- this.fetcher.enhanceForm() -->
      <form style="display: inline" action="/tasks" method="post">
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
