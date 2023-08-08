import { ActionFunctionArgs, redirect } from "@remix-run/router";
import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { RouterController } from "remix-router-lit";
import { addTask } from "../../tasks";
import { sleep } from "../../utils";

export async function action({ request }: ActionFunctionArgs) {
  await sleep();
  let formData = await request.formData();
  addTask(formData.get("new-task") as string);
  return redirect("/tasks", { status: 302 });
}

@customElement("app-new-task")
export class NewTask extends LitElement {
  private router = new RouterController(this);

  get isAdding() {
    return this.router.navigation.state !== "idle";
  }

  render() {
    return html`
      <h3>New Task</h3>
      <form ${this.router.enhanceForm()} method="post">
        <input
          name="new-task"
          placeholder="Add a task..."
          ?disabled=${this.isAdding}
        />
        <button type="submit" ?disabled=${this.isAdding}>
          ${this.isAdding ? "Adding..." : "Add"}
        </button>
      </form>
    `;
  }
}
