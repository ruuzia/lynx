import { MakeItemsDraggable } from "./util/draggablelist.js";
import * as Save from "./save.js"
const html = String.raw

//-----------------------------------
/**
 * Lightweight wrapper around document.createElement.
 */
function $create<K extends keyof HTMLElementTagNameMap>(type: K, props?: Object, children?: HTMLElement[]|string): HTMLElementTagNameMap[K] {
    const elem = document.createElement(type);
    for (const [k, v] of Object.entries(props ?? {})) {
        elem[k] = v;
    }
    if (typeof children == 'string') {
        elem.innerHTML = children;
    } else {
        for (const child of children ?? []) {
            elem.appendChild(child);
        }
    }
    return elem;
}

/**
 * Lightweight wrapper around document.querySelector with type checking.
 */
function $query<T extends Element>(query: string, type: new() => T): T {
    const elem = document.querySelector(query);
    if (elem == null) {
        throw new Error(`$query failed to find ${query}`);
    }
    if (!(elem instanceof type)) {
        throw new Error(`$query ${query} expected ${type}`);
    }
    return elem;
}
//-----------------------------------

document.head.appendChild($create("link",
    {
        rel: "stylesheet",
        href: "/static/style/browser.css",
    },
));

const browser = $query("#browser", HTMLDivElement);
browser.appendChild($create("h1", {}, "Line browser" ));

const selector = browser.appendChild($create("select",
    {
        id: "browser-line-select",
        onchange: () => {
            load(selector.value);
        }
    }
));
const container = browser.appendChild($create("div",
    { id: "browser-container" },
));


//-----------------------------------

let lines: Card[]

export function UpdateLineSets(sets: string[]) {
    selector.replaceChildren();
    for (const name of sets) {
        selector.add($create("option", { value: name }, name ));
    }
}

export function Init() {
    if (!(selector instanceof HTMLSelectElement)) {
        throw new Error("missing #browser-line-select");
    }
    const title = selector.value;
    if (title == null || title == "") {
        throw new Error("no lineset selected");
    }
    load(title);

}

function load(title: string) {
    console.log("Loading line set title: " + name)
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
    container.innerHTML = "";
    for (const item of lines) {
        const [linePre, linePost] = sepLine(item.line)
        const [cuePre, cuePost] = sepLine(item.cue)
        console.log(linePre, linePost);
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
