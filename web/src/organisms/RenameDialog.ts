import { displayDialog } from "../molecules/dialog.js";
import { query, html } from "../util/dom.js";
import { RenameLineset } from "../util/LineSets.js";

export default function (currentTitle: string, id: number, onrename?: (newName: string) => void) {
  const renameDialog = displayDialog( "Rename Line Set", html`
<div>
  <label>
    New title:
    <input value="${currentTitle}" id="browser-rename-input" autofocus></input>
  </label>
</div>
<div>
  <button value="success" id="browser-rename-save-btn" style="background-color: var(--color-active-1)">Save</button>
  <button value="cancel">Cancel</button>
</div>
      `
  );

  renameDialog.onclose = async () => {
    if (renameDialog.returnValue != "success") return;

    const newName = query("#browser-rename-input", HTMLInputElement).value;

    await RenameLineset(id, newName);
    if (onrename) onrename(newName);
  };
}
