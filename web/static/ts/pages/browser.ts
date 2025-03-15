import { MakeItemsDraggable } from "../util/draggablelist.js";
import { create, query } from "../util/dom.js";
const html = String.raw; // Editor HTML highlighting in template strings

// Wait until stylesheet is loaded
await new Promise((resolve, reject) => {
  const link = document.head.appendChild(
    create("link", {
      rel: "stylesheet",
      href: "/static/style/browser.css",
      onload: () => {
        resolve(link);
      },
    }),
  );
});

//---------------------------------------------
function buildModals() {
  const modal = (id: string, title: string, content: string) =>
    create(
      "dialog",
      { id: id, classList: "modal" },
      html`
        <form method="dialog">
          <header class="modal-header">
            <h2 class="modal-title">${title}</h2>
            <button class="modal-close" aria-label="Close"></button>
          </header>

          <div class="modal-maincontent">${content}</div>
        </form>
      `,
    );

  const renameModal = browser.appendChild(
    modal(
      "browser-rename",
      "Rename Line Set",
      html`
<div>
  <label>
    New title:
    <input autofocus id="browser-rename-input"></input>
  </label>
</div>
<div>
  <button id="browser-rename-save-btn" style="background-color: var(--color-active-1)">Save</button>
  <button>Cancel</button>
</div>
`,
    ),
  );

  const saveRename = () => {
    const input = query("#browser-rename-input", HTMLInputElement);
    const newName = input.value;
    console.log("saveRename", selector.value, input.value);
    renameModal.close();
  };

  renameModal.onclick = (e) => {
    if (
      e.target instanceof HTMLElement &&
      e.target.id == "browser-rename-save-btn"
    )
      saveRename();
  };

  renameModal.onkeydown = (e) => {
    if (
      e.key == "Enter" &&
      e.target instanceof HTMLElement &&
      e.target.id == "browser-rename-input"
    )
      saveRename();
  };

  browser.appendChild(
    modal(
      "browser-new-lineset",
      "Create New Line Set",
      html`

<div>
  <label>
    Title:
    <input></input>
  </label>
</div>
<div>
  <button style="background-color: var(--color-active-1)">Save</button>
  <button formmethod="dialog">Cancel</button>
</div>

`,
    ),
  );

  browser.appendChild(
    modal(
      "browser-delete-lineset",
      "Delete Line Set",
      html`
        <p id="delete-lineset-message"></p>
        <div>
          <button
            style="background-color: red"
            id="browser-delete-lineset-button"
          >
            Delete
          </button>
          <button formmethod="dialog">Cancel</button>
        </div>
      `,
    ),
  );
}
// buildModals()

// Note: beforetoggle event not currently implemented on Safari for Modals as of March 2025
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/beforetoggle_event#browser_compatibility
// So we activate modals with this function instead
function showModal(q: string) {
  const modal = query(q, HTMLDialogElement);
  switch (modal.id) {
    case "browser-new-lineset":
      break;
    case "browser-rename":
      const input = query("#browser-rename-input", HTMLInputElement);
      input.value = selector.value;
      break;
    case "browser-delete-lineset":
      const message = query("#delete-lineset-message", HTMLElement);
      message.innerHTML = `Are you sure you want to permamently delete line set <b>${selector.value}</b>?`;
      query("#browser-delete-lineset-button", HTMLElement).innerText =
        `Delete ${selector.value}`;
  }
  modal.showModal();
}

//----------------------------

function makeDropdown(
  container: HTMLElement,
  onselect?: (option: Element) => void,
) {
  const isDropdownItem = (elem: Node | EventTarget | null) =>
    elem instanceof HTMLElement && elem.classList.contains("dropdown-item");
  const isDropdownButton = (elem: Node | EventTarget | null) =>
    elem instanceof HTMLElement && elem.classList.contains("dropdown-button");

  container.onclick = (e) => {
    const elem = e.target;
    if (!elem || !(elem instanceof Element)) return;
    const options = query(".dropdown-options", HTMLElement, container);

    if (elem.classList.contains("dropdown-button")) {
      options.hidden = !options.hidden;
      // Prevent event from reaching window listener
      e.stopPropagation();
    } else if (elem.classList.contains("dropdown-item")) {
      if (onselect) onselect(elem);
    }
  };

  // Close on click outside
  container.addEventListener("focusout", (e) => {
    if (
      !isDropdownItem(e.relatedTarget) &&
      !isDropdownButton(e.relatedTarget)
    ) {
      console.log("container->focusout", e.relatedTarget);
      query(".dropdown-options", HTMLElement, container).hidden = true;
    }
  });

  container.onkeydown = (e) => {
    if (!(e.target instanceof HTMLElement)) return;
    const options = query(".dropdown-options", HTMLElement, container);

    if (isDropdownButton(e.target) && (e.key == " " || e.key == "Enter")) {
      options.hidden = !options.hidden;
      return false;
    } else if (isDropdownItem(e.target) && (e.key == " " || e.key == "Enter")) {
      e.target.click();
      return false;
    }

    if (e.key == "ArrowUp" || e.key == "ArrowDown") {
      if (isDropdownButton(e.target)) {
        // Focus first dropdown item
        (
          options.children[
            e.key == "ArrowDown" ? 0 : options.children.length - 1
          ] as HTMLElement
        ).focus();
      } else if (isDropdownItem(e.target)) {
        if (e.key == "ArrowUp") {
          (e.target == options.children[0]
            ? (options.children[options.children.length - 1] as HTMLElement)
            : (e.target.previousElementSibling as HTMLElement)
          ).focus();
        }
        if (e.key == "ArrowDown") {
          (e.target == options.children[options.children.length - 1]
            ? (options.children[0] as HTMLElement)
            : (e.target.nextElementSibling as HTMLElement)
          ).focus();
        }
      }
      return false;
    }

    if (e.key == "Escape") {
      options.hidden = true;
      return false;
    }
  };
  return container;
} //makeDropdown()
//--------------------------------

const browser = query("#browser", HTMLDivElement);

const selector = create("select", {
  id: "browser-line-select",
  onchange: () => {
    load(selector.value);
  },
});

const dropdown = makeDropdown(
  create(
    "div",
    { classList: "actions-dropdown" },
    html`
      <div class="dropdown-button buttonify" tabindex="0">Actions ▼</div>
      <div class="dropdown-options" hidden>
        <div
          tabindex="-1"
          class="dropdown-item rename"
          data-show-modal="#browser-rename"
        >
          Rename
        </div>
        <div
          tabindex="-1"
          class="dropdown-item"
          data-show-modal="#browser-new-lineset"
        >
          New Lineset
        </div>
        <div
          tabindex="-1"
          class="dropdown-item"
          data-show-modal="#browser-delete-lineset"
        >
          Delete Lineset
        </div>
      </div>
    `,
  ),
  (selection) => {
    const modal = selection.getAttribute("data-show-modal");
    if (modal) {
      showModal(modal);
    }
  },
);

browser.appendChild(
  create(
    "div",
    {
      classList: "browser-heading",
    },
    [selector, dropdown],
  ),
);

const container = browser.appendChild(
  create("div", { id: "browser-container" }),
);

buildModals();

document.body.appendChild(
  create(
    "div",
    {},
    html`
      <dialog id="test-dialog">
        <button autofocus>Close</button>
        <p>This modal dialog has a groovy backdrop!</p>
      </dialog>
    `,
  ),
);

//-------------------------------------

let lines: Card[];
let line_set: string | null;

export function UpdateLineSets(sets: string[]) {
  selector.replaceChildren();
  for (const name of sets) {
    selector.add(create("option", { value: name }, name));
  }
  if (line_set) selector.value = line_set;
}

export function SelectLineSet(title: string) {
  line_set = title;
}

export function Init() {
  const title = line_set ?? selector.options[0].value;
  if (title == null || title == "") {
    throw new Error("no lineset selected");
  }
  load(title);
}

function getLineData(id: number) {
  return lines.find((item) => item.index == id);
}

function load(title: string) {
  console.log("Loading line set title: " + title);
  fetch("/feline/get-line-data", {
    method: "POST",
    body: new URLSearchParams({
      title: title,
    }),
  })
    .then((r) => r.json())
    .then((lineData) => {
      render(lineData);
    });
}

function sepLine(line: string): [string, string] {
  const sepIndex = line.indexOf(":");
  return [line.slice(0, sepIndex), line.slice(sepIndex + 1, line.length)];
}

function render(lines_: Card[]) {
  lines = lines_;
  container.replaceChildren();
  for (const item of lines) {
    const [linePre, linePost] = sepLine(item.line);
    const [cuePre, cuePost] = sepLine(item.cue);
    const card = container.appendChild(
      create(
        "div",
        { classList: "card" },
        html`
<div class="card-flex">
  <div class="card-sidebar">
    <div class="card-view-toggle">﹀</div>
    <div class="card-mover clickable">
      <svg width="30px" height="30px" viewBox="0 0 256 256" id="Flat" xmlns="http://www.w3.org/2000/svg">
        <path d="M104,60.0001a12,12,0,1,1-12-12A12,12,0,0,1,104,60.0001Zm60,12a12,12,0,1,0-12-12A12,12,0,0,0,164,72.0001Zm-72,44a12,12,0,1,0,12,12A12,12,0,0,0,92,116.0001Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116.0001Zm-72,68a12,12,0,1,0,12,12A12,12,0,0,0,92,184.0001Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184.0001Z"/>
      </svg>
    </div>
  </div>
  <div class="card-content">
    <div class="cue-container">
      <label for="cue">${cuePre}:</label>
      <div name="cue" class="cue" contenteditable=true>${cuePost}</div>
    </div>
    <div class="line-container">
      <label for="line">${linePre}:</label>
      <div name="line" class="line" contenteditable=true>${linePost}</div>
    </div>
    <div class="line-metadata">
      <textarea name="linenotes" class="linenotes" placeholder="Add line notes">${item.notes}</textarea>
      <label>
        <input class="starred" type="checkbox" name="starred" ${item.starred ? "checked" : ""}></input>
        Starred
      </label>
    </div>
  </div>
</div>
<div class="card-add-position">
  <div class="card-add">
    <hr />
    <button class="card-add-btn">+ Add</button>
  </div>
</div>
`,
      ),
    );

    // Accordian expand/contract
    card.addEventListener("click", (event) => {
      if (event.target == null) return;
      if (!(event.target instanceof HTMLElement)) return;

      if (event.target.classList.contains("card-view-toggle")) {
        card.classList.toggle("card-squished");
      }
      if (event.target.classList.contains("card-add-btn")) {
        console.log("card-add", event.target);
        event.preventDefault();
      }
    });

    const notes = query(".linenotes", HTMLTextAreaElement, card);
    const cue = query(".cue", HTMLDivElement, card);
    const line = query(".line", HTMLDivElement, card);
    const starred = query(".starred", HTMLInputElement, card);

    const onCardUpdate = async () => {
      item.notes = notes.value;
      item.cue = cuePre + ": " + cue.innerText;
      item.line = linePre + ": " + line.innerText;
      item.starred = starred.checked;
      const resp = await fetch(`/feline/items/${item.id}`, {
        method: "PUT",
        body: JSON.stringify(item),
      })
      console.log("PUT request: ", resp.statusText)
    }
    notes.addEventListener("input", onCardUpdate);
    cue.addEventListener("input", onCardUpdate);
    line.addEventListener("input", onCardUpdate);
    starred.addEventListener("input", onCardUpdate);
  }

  MakeItemsDraggable(container, {
    canDrag: (e) =>
      !(
        (e.target instanceof HTMLDivElement &&
          e.target.classList.contains("card-view-toggle")) ||
        e.target instanceof HTMLInputElement ||
        (e.target instanceof HTMLDivElement && e.target.contentEditable) ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLButtonElement
      ),
    onUpdated: (oldIndex, newIndex, item) => {
      console.log(`old:${oldIndex} new:${newIndex}`);
    },
  });
}
