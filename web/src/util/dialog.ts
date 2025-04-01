import { create } from "./dom.js";
const html = String.raw; // Editor HTML highlighting in template strings

const container = document.body.appendChild(create("div"));

export const displayDialog = (title: string, content: string) => {
  const dialog = create(
    "dialog",
    { classList: "modal" },
    html`
<form method="dialog">
  <header class="modal-header">
    <h2 class="modal-title">${title}</h2>
    <button
      value="close"
      class="modal-close"
      aria-label="Close"
    ></button>
  </header>
</form>
<form method="dialog">
  <div class="modal-maincontent">${content}</div>
</form>
`,
  );
  container.replaceChildren(dialog);
  dialog.showModal();
  return dialog;
}
