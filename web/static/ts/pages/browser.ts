import { MakeItemsDraggable } from "../util/draggablelist.js";
import { $create, $query } from "../util/dom.js";
import MicroModal from "/static/node_modules/micromodal/dist/micromodal.es.js"

const html = String.raw;

document.head.appendChild($create("link",
    {
        rel: "stylesheet",
        href: "/static/style/browser.css",
    },
));

const browser = $query("#browser", HTMLDivElement);
browser.appendChild($create( "h1", {}, "Line browser" ));

const selector = browser.appendChild($create("select",
    {
        id: "browser-line-select",
        onchange: () => {
            load(selector.value);
        }
    }
));

const dropdown = browser.appendChild($create("div",
    { classList: "actions-dropdown" },
    html`
<div class="dropdown-button buttonify">Actions ▼</div>
<div class="dropdown-options" hidden>
    <div class="dropdown-item rename" data-micromodal-trigger="browser-rename">Rename</div>
    <div class="dropdown-item new-lineset">New Lineset</div>
    <div class="dropdown-item delete">Delete Lineset</div>
</div>
`,
));

browser.appendChild($create("div",
    { id: "browser-rename", ariaHidden: "true", classList: "modal" },
    html`
  <div tabindex="-1" data-micromodal-close class="modal-overlay">

    <div role="dialog" aria-modal="true" aria-labelledby="browser-rename" class="modal-container">

      <header>
        <h2 class="modal-title">
          Rename Line Set
        </h2>

        <button class="modal-close" aria-label="Close" data-micromodal-close></button>
      </header>

      <div id="browser-rename-content">
        <label>
          Title:
          <input id="browser-rename-input"></input>
        </label>
      </div>
    </div>
  </div>
`
));

MicroModal.init();

browser.appendChild($create("div", {
    classList: "browser-heading",
}, [ selector, dropdown ]))

dropdown.onclick = (e) => {
    const elem = e.target;
    console.log(elem);
    if (!elem || !(elem instanceof Element)) return;
    const options = dropdown.querySelector(".dropdown-options");
    if (options == null || !(options instanceof HTMLElement)) throw new Error("Missing .dropdown-options");

    if (elem.classList.contains("dropdown-button")) {
        options.hidden = !options.hidden;

        // Ensure close on next click
        window.addEventListener("click", () => {
            options.hidden = true;
        }, { once: true })
        // Prevent the listener we just added from getting fired right now
        e.stopPropagation();
    } else if (elem.classList.contains("dropdown-item")) {
        options.hidden = true;
        if (elem.classList.contains("rename")) {
            $query("#browser-rename-input", HTMLInputElement).value = selector.value;
            console.log("RENAME not implemented")
        } else if (elem.classList.contains("new-lineset")) {
            console.log("New-lineset not implemented")
        } else if (elem.classList.contains("delete")) {
            console.log("Delete not implemented")
        }
    }
}

const container = browser.appendChild($create("div",
    { id: "browser-container" },
));


//-----------------------------------

let lines: Card[]
let line_set: string|null

export function UpdateLineSets(sets: string[]) {
    selector.replaceChildren();
    for (const name of sets) {
        selector.add($create("option", { value: name }, name ));
    }
    if (line_set) selector.value = line_set
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
    console.log("Loading line set title: " + title)
    fetch('/feline/get-line-data', {
        method: "POST",
        body: new URLSearchParams({
            title: title,
        }),
    }).then(r => r.json())
        .then((lineData) => {
            render(lineData);

        });
}

function sepLine(line: string): [string, string] {
    const sepIndex = line.indexOf(":");
    return [line.slice(0, sepIndex), line.slice(sepIndex+1, line.length)];
}

function render(lines_: Card[]) {
    lines = lines_
    container.replaceChildren();
    for (const item of lines) {
        const [linePre, linePost] = sepLine(item.line)
        const [cuePre, cuePost] = sepLine(item.cue)
        const card = container.appendChild($create("div",
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
`
        ));

        // Accordian expand/contract
        card.addEventListener("click", (event) => {
            if (event.target == null) {
                console.log("browserCardClick target is null");
                return;
            }
            if(!(event.target instanceof HTMLElement)) return;

            if (event.target.classList.contains("card-view-toggle")) {
                card.classList.toggle("card-squished");
            }
        })
    }

    MakeItemsDraggable(container, {
        canDrag: (e) => !(e.target instanceof HTMLDivElement
                       && e.target.classList.contains("card-view-toggle")),
        onUpdated: (oldIndex, newIndex, item) => {
            console.log(`old:${oldIndex} new:${newIndex}`)
        }
    });
}

function getLineData(id: number) {
    return lines.find(item => item.id == id);
}
