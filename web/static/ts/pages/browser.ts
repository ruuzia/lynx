import { MakeItemsDraggable } from "../util/draggablelist.js";
import { create, query } from "../util/dom.js";
import MicroModal from "/static/node_modules/micromodal/dist/micromodal.es.js";
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
      "div",
      { id: id, ariaHidden: "true", classList: "modal" }, html`
<div tabindex="-1" data-micromodal-close class="modal-overlay">
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="${id}"
    class="modal-container"
  >
    <header class="modal-header">
      <h2 class="modal-title">${title}</h2>
      <button
        class="modal-close"
        aria-label="Close"
        data-micromodal-close
      ></button>
    </header>

    <div class="modal-maincontent">${content}</div>
  </div>
</div>
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
    <input id="browser-rename-input"></input>
  </label>
</div>
<div>
  <button id="browser-rename-save-btn" style="background-color: var(--color-active-1)">Save</button>
  <button data-micromodal-close>Cancel</button>
</div>
`,
    ),
  );

  const saveRename = () => {
    const input = query("#browser-rename-input", HTMLInputElement);
    const newName = input.value;
    console.log("saveRename", selector.value, input.value);
    MicroModal.close(renameModal.id);
  };

  renameModal.onclick = (e) =>
    e.target instanceof HTMLElement &&
    e.target.id == "browser-rename-save-btn" &&
    saveRename();
  renameModal.onkeydown = (e) =>
    e.key == "Enter" &&
    e.target instanceof HTMLElement &&
    e.target.id == "browser-rename-input" &&
    saveRename();

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
  <button data-micromodal-close>Cancel</button>
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
          <button data-micromodal-close>Cancel</button>
        </div>
      `,
    ),
  );

  MicroModal.init({
    onShow: (modal) => {
      const options = query(".dropdown-options", HTMLElement, dropdown);
      if (modal?.id == "browser-rename") {
        const input = query("#browser-rename-input", HTMLInputElement);
        input.value = selector.value;
        options.hidden = true;
      } else if (modal?.id == "browser-delete-lineset") {
        const message = query("#delete-lineset-message", HTMLElement);
        message.innerHTML = `Are you sure you want to permamently delete line set <b>${selector.value}</b>?`;
        query("#browser-delete-lineset-button", HTMLElement).innerText =
          `Delete ${selector.value}`;
      }
    },
  });
}
// buildModals()
//----------------------------

function makeDropdown(
  container: HTMLElement,
  onselect?: (option: Element) => void,
) {
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
  window.addEventListener("click", () => {
    const options = query(".dropdown-options", HTMLElement, container);
    options.hidden = true;
  });

  container.onkeydown = (e) => {
    if (!(e.target instanceof HTMLElement)) return;
    const options = container.querySelector(".dropdown-options");
    if (!(options instanceof HTMLElement))
      throw new Error("Missing .dropdown-options");

    if (e.target.classList.contains("dropdown-button") && e.key == " ") {
      options.hidden = !options.hidden;
      e.preventDefault();
    }

    if (
      e.target.classList.contains("dropdown-item") &&
      (e.key == "Enter" || e.key == "Space")
    ) {
      const modalId = e.target.getAttribute("data-micromodal-trigger");
      if (modalId) MicroModal.show(modalId);
      e.preventDefault();
    }
  };
  return container;
} //makeDropdown()
//--------------------------------

const browser = query("#browser", HTMLDivElement);

browser.appendChild(create("h1", {}, "Line browser"));

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
          tabindex="0"
          class="dropdown-item rename"
          data-micromodal-trigger="browser-rename"
        >
          Rename
        </div>
        <div
          tabindex="0"
          class="dropdown-item new-lineset"
          data-micromodal-trigger="browser-new-lineset"
        >
          New Lineset
        </div>
        <div
          tabindex="0"
          class="dropdown-item delete"
          data-micromodal-trigger="browser-delete-lineset"
        >
          Delete Lineset
        </div>
      </div>
    `,
  ),
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
        {
          classList: "card card-squished",
        },
        html`
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
      <input type="checkbox" name="starred" ${item.starred ? "checked" : ""}></input>
      Starred
    </label>
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
    });
  }

  MakeItemsDraggable(container, {
    canDrag: (e) =>
      !(
        e.target instanceof HTMLDivElement &&
        e.target.classList.contains("card-view-toggle")
      ),
    onUpdated: (oldIndex, newIndex, item) => {
      console.log(`old:${oldIndex} new:${newIndex}`);
    },
  });
}

function getLineData(id: number) {
  return lines.find((item) => item.id == id);
}
