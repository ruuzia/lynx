import { MakeItemsDraggable } from "../util/draggablelist.js";
import { create, query, html } from "../util/dom.js";
import RenameDialog from "../organisms/RenameDialog.js";
import NewLinesetDialog from "../organisms/NewLinesetDialog.js";
import DeleteLinesetDialog from "../organisms/DeleteLinesetDialog.js";
import Dropdown from "../atoms/Dropdown.js";

// Wait until stylesheet is loaded
await new Promise((resolve, _reject) => {
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

const getDeckTitle = () => selector.value;
const getDeckId = () =>
  parseInt(selector.children[selector.selectedIndex].getAttribute("data-lineset-id") ?? "");

//---------------------------------------------

/**
 * Wrapper around fetch to always check result so I don't forget.
 */
async function request(url: RequestInfo, opts?: RequestInit) {
    const res = await fetch(url, opts);
    if (!res.ok) {
        throw new Error(`Failed fetch for '${url}'`);
    }
    return await res.json();
}

async function fetchLineSets() {
  const data = await request("/feline/linesets", { method: "GET" });
  UpdateLineSets(data);
}

async function fetchLineData(id: number): Promise<Card[]> {
  const lines = await request(`/feline/linesets/${id}/items`, {
    method: "GET",
  });
  return lines ?? [];
}

async function updateCard(item: Card) {
  return await request(`/feline/items/${item.id}`, {
    method: "PUT",
    body: JSON.stringify(item),
  });
}

async function deleteCard(id: number) {
  return await request(`/feline/items/${id}`, {
    method: "DELETE",
  });
}

async function postCard(deckId: number, card: Card) {
  return await request(`/feline/linesets/${deckId}/items/`, {
    method: "POST",
    body: JSON.stringify(card),
  })
}

async function updateOrdering(deckId: number, ordering: number[]) {
  return await request(`/feline/linesets/${deckId}/items/ordering`, {
    method: "POST",
    body: JSON.stringify(ordering),
  })
}

//--------------------------------------

const browser = query("#browser", HTMLDivElement);

const selector = create("select", {
  id: "browser-line-select",
  onchange: async () => {
    await load();
  },
});

const dropdown = Dropdown(
  create(
    "div",
    { classList: "actions-dropdown" },
    html`
      <div class="dropdown-button buttonify" tabindex="0">Actions ▼</div>
      <div class="dropdown-options" hidden>
        <div
          tabindex="-1"
          class="dropdown-item rename"
          data-show-modal="browser-rename"
        >
          Rename
        </div>
        <div
          tabindex="-1"
          class="dropdown-item"
          data-show-modal="new-lineset"
        >
          New Lineset
        </div>
        <div
          tabindex="-1"
          class="dropdown-item"
          data-show-modal="delete-lineset"
        >
          Delete Lineset
        </div>
      </div>
    `,
  ),
  (selection) => {
    const modal = selection.getAttribute("data-show-modal");
    const id = getDeckId();
    switch (modal) {
      case "new-lineset":
        NewLinesetDialog(async (title, _id) => {
          await fetchLineSets();
          selector.value = title;
          load();
        });
        break;
      case "browser-rename":
        if (id != null) {
          RenameDialog(selector.value, id, (newName: string) => {
            fetchLineSets().then(() => (selector.value = newName));
          });
        }
        break;
      case "delete-lineset":
        if (id != null) DeleteLinesetDialog(selector.value, id, async () => {
          await fetchLineSets();
          if (selector.options[0]) selector.value = selector.options[0].value;
          load();
        });
        break;
      default:
        console.error("Unknown dialog: " + q)
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

export function UpdateLineSets(sets: DeckInfo[]) {
  const save = selector.value || localStorage.getItem("browser-line-set");
  selector.replaceChildren();
  for (const { id, title } of sets) {
    selector.add(
      create(
        "option",
        {
          value: title,
          "$data-lineset-id": id,
        },
        title,
      ),
    );
  }
  if (save) {
    console.log(`UpdateLineSets (keeping selection ${save})`);
    selector.value = save;
  }
}

export function SelectLineSet(lineSet: DeckInfo) {
  selector.value = lineSet.title;
  console.log("SelectLineSet", selector.value);
}

export function Init() {
  if (selector.value == "") {
    console.log("[browser] No lineset selected");
    selector.value = selector.options[0].value;
  }
  load();
}

async function load() {
  const title = getDeckTitle();
  const id = getDeckId();
  localStorage.setItem("browser-line-set", title);
  console.log("Loading line set title: " + title);
  render(await fetchLineData(id));
}

function sepLine(line: string): [string, string] {
  const sepIndex = line.indexOf(":");
  if (sepIndex == -1) return ["", line];
  return [line.slice(0, sepIndex+1), line.slice(sepIndex + 1, line.length)];
}

function render(lines: Card[]) {
  if (lines.length == 0) {
    // Start with one card
    addNewCard(0);
  }
  container.replaceChildren();
  for (const item of lines) {
    container.appendChild(buildCard(item));
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
    onUpdated: (oldIndex, newIndex, _item) => {
      console.log(`DRAG old:${oldIndex} new:${newIndex}`);
      const element = lines[oldIndex];
      lines.splice(oldIndex, 1);
      lines.splice(newIndex, 0, element);
      postOrdering();
    },
  });

  function renderCue (line: string) {
    const [cuePre, cuePost] = sepLine(line);
    return `
      <div class="cue-view" tabindex=0>
        <label for="cue">${cuePre}</label>
        <div name="cue" class="cue">${cuePost}</div>
      </div>
`
  }
  function renderLine (line: string) {
    const [linePre, linePost] = sepLine(line);
    return `
      <div class="line-view" tabindex=0>
        <label for="line">${linePre}</label>
        <div name="line" class="line">${linePost}</div>
      </div>
`
  }

  function buildCard(item: Card) {
    const card = create(
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
    <div class="spacer"></div>

  </div>

  <div class="card-content">
    <div class="cue-container">
      ${renderCue(item.cue)}
    </div>
    <div class="line-container">
      ${renderLine(item.line)}
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
<div class="card-bottom-relative">
  <div class="card-bottom">
    <hr />
    <div class="card-bottom-items">
      <button class="card-add-btn">+ Add</button>

      <div class="menu-dropdown">
        <button class="dropdown-button card-menu-btn" aria-label="menu">︙ More</button>
        <div class="dropdown-options" hidden>
          <button class="dropdown-item card-remove-option" tabindex="-1">Remove card</button>
        </div>
      </div>
    </div>

  </div>
</div>
`,
    );

    card.addEventListener("focusin", (e) => {
      if (!(e.target instanceof HTMLElement)) return;
      if (e.target.classList.contains("cue-view")) {
        const cueContainer = query(".cue-container", HTMLElement, card);
        const cueEdit = create("div", {
          className: "cue-edit",
          contentEditable: "true",
        }, `${item.cue}`)
        cueContainer.replaceChildren(cueEdit);
        cueEdit.focus();
        cueEdit.addEventListener("focusout", () => {
          cueContainer.innerHTML = renderCue(cueEdit.innerText);
          item.cue = cueContainer.innerText;
          onCardUpdate();
        })
      }

      if (e.target.classList.contains("line-view")) {
        const lineContainer = query(".line-container", HTMLElement, card);
        const lineEdit = create("div", {
          className: "line-edit",
          contentEditable: "true",
        }, `${item.line}`)
        lineContainer.replaceChildren(lineEdit);
        lineEdit.focus();
        lineEdit.addEventListener("focusout", () => {
          lineContainer.innerHTML = renderLine(lineEdit.innerText);
          item.line = lineContainer.innerText;
          onCardUpdate();
        })
      }
    })

    // Accordian expand/contract
    card.addEventListener("click", (event) => {
      if (event.target == null) return;
      if (!(event.target instanceof HTMLElement)) return;

      if (event.target.classList.contains("card-view-toggle")) {
        card.classList.toggle("card-squished");
      }
      if (event.target.classList.contains("card-add-btn")) {
        addNewCard(item.index);
        event.preventDefault();
      }

      if (event.target.classList.contains("card-menu-btn")) {
      }
    });

    const notes = query(".linenotes", HTMLTextAreaElement, card);
    const cue = query(".cue", HTMLDivElement, card);
    const line = query(".line", HTMLDivElement, card);
    const starred = query(".starred", HTMLInputElement, card);

    const onCardUpdate = async () => {
      item.notes = notes.value;
      item.starred = starred.checked;
      updateCard(item);
    };
    notes.addEventListener("input", onCardUpdate);
    cue.addEventListener("input", onCardUpdate);
    line.addEventListener("input", onCardUpdate);
    starred.addEventListener("input", onCardUpdate);

    Dropdown(query(".menu-dropdown", HTMLDivElement, card), (selected) => {
      if (selected.classList.contains("card-remove-option")) {
        removeCard(item);
      }
    });

    return card;
  }

  async function removeCard(item: Card) {
    console.log("Removing card!")
    await deleteCard(item.id);
    lines.splice(item.index, 1);
    await postOrdering();
    return render(lines);
  }

  function addNewCard(index: number): void {
    const item: Card = {
      id: -1,
      cue: "",
      line: "",
      notes: "",
      index: index,
      starred: false,
    };
    lines.splice(index+1, 0, item);

    // Update server in background without blocking client
    (async () => {
      const { id } = await postCard(getDeckId(), item);
      item.id = id;
      console.log(item.id);

      await postOrdering();
    })()

    render(lines);
    // Focus new card input
    query(".cue-view", HTMLElement, container.children[index+1]).focus();
  }

  const postOrdering = async () => {
    // We also updatte our own .index values
    for (const [i, v] of lines.entries()) v.index = i;
    updateOrdering(getDeckId(), lines.map(line => line.id));
  }
}
