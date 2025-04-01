import { displayDialog } from "./dialog.js";
import { html } from "./dom.js";

export default function (title: string, id: number, ondeleted=async () => {}) {
  const deleteDialog = displayDialog("Delete Line Set", html`
<p id="delete-lineset-message">Are you sure you want to permamently delete line set <b>${title}</b></p>
<div>
  <button
    value="success"
    style="background-color: red"
    id="browser-delete-lineset-button"
  >
    Delete ${title}
  </button>
  <button formmethod="dialog">Cancel</button>
</div>
`,
  );

  deleteDialog.onclose = async () => {
    if (deleteDialog.returnValue != "success") return;
    {
      const res = await fetch(`/feline/linesets/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Delete failed! " + await res.text())
      }
    }

    ondeleted();
  }
}

