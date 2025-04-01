import { displayDialog } from "../molecules/dialog.js";
import { query, html } from "./dom.js";

export default function(oncreate = async (title: string, id: number) => {}) {
  const dialog = displayDialog("Create New Line Set", html`
<div>
  <label>
    Title:
    <input autofocus id="browser-create-title"></input>
  </label>
</div>
<div>
  <button value="success" style="background-color: var(--color-active-1)">Save</button>
  <button formmethod="dialog">Cancel</button>
</div>`
  );
  dialog.onclose = async () => {
    if (dialog.returnValue != "success") return;
    const title = query("#browser-create-title", HTMLInputElement).value;

    const res = await fetch(`/feline/linesets`, {
      method: "POST",
      body: JSON.stringify({ title: title, })
    });
    if (!res.ok) {
      throw new Error("Creating failed! " + await res.text());
    }
    const id = parseInt(await res.text());
    if (oncreate) oncreate(title, id);
  };
}
