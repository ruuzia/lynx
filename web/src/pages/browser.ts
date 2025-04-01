import { MakeItemsDraggable } from "../util/draggablelist.js";
import { create, query, html } from "../util/dom.js";
import request from "../util/request.js"
import RenameDialog from "../organisms/RenameDialog.js";
import NewLinesetDialog from "../organisms/NewLinesetDialog.js";
import DeleteLinesetDialog from "../organisms/DeleteLinesetDialog.js";
import Dropdown from "../atoms/Dropdown.js";
import BrowserCard from "../organisms/BrowserCard.js";
import { GetLinesets } from "../util/LineSets.js";

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
  const result = await request(`/feline/linesets/${deckId}/items`, {
    method: "POST",
    body: JSON.stringify(card),
  })
  return result;
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
    const id = getDeckId();
    switch (selection.getAttribute("data-show-modal")) {
      case "new-lineset":
        NewLinesetDialog(async (title, _id) => {
          UpdateLineSets(await GetLinesets())
          selector.value = title;
          load();
        });
        break;
      case "browser-rename":
        if (id != null) {
          RenameDialog(selector.value, id, (newName: string) => {
            selector.value = newName;
          });
        }
        break;
      case "delete-lineset":
        if (id != null) {
          DeleteLinesetDialog(selector.value, id, async () => {
            UpdateLineSets(await GetLinesets())
            if (selector.options[0]) selector.value = selector.options[0].value;
            load();
          });
        }
        break;
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

//------------------------------------

async function load() {
  UpdateLineSets(await GetLinesets());
  const title = getDeckTitle();
  const id = getDeckId();
  localStorage.setItem("browser-line-set", title);
  render(await fetchLineData(id));
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

  function buildCard(item: Card) {
    return BrowserCard(item, {
      onRemove: () => removeCard(item),
      onUpdate: () => updateCard(item),
      onRequestAdd: () => addNewCard(item.index),
    });
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
