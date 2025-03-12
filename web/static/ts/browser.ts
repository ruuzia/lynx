import { MakeItemsDraggable } from "./draggablelist.js";
import * as Save from "./save.js"
const html = String.raw

let lines: Card[]

const selector = document.getElementById("browser-line-select");
if (!(selector instanceof HTMLSelectElement)) {
    throw new Error("missing #browser-line-select");
}
selector.onchange = () => {
    console.log("selector.onchange")
    load(selector.value);
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
    const container = document.getElementById("browser-container");
    if (container === null) {
        throw new Error("Missing #browser-container");
    }
    container.innerHTML = "";
    for (const item of lines) {
        const [linePre, linePost] = sepLine(item.line)
        const [cuePre, cuePost] = sepLine(item.cue)
        console.log(linePre, linePost);
        const card = document.createElement("div");
        card.classList.add("browser-card");
        card.innerHTML = html`
<div class="browser-card-sidebar">
  <div class="browser-card-view-toggle">﹀</div>
  <div class="browser-card-mover">
    <svg width="30px" height="30px" viewBox="0 0 256 256" id="Flat" xmlns="http://www.w3.org/2000/svg">
      <path d="M104,60.0001a12,12,0,1,1-12-12A12,12,0,0,1,104,60.0001Zm60,12a12,12,0,1,0-12-12A12,12,0,0,0,164,72.0001Zm-72,44a12,12,0,1,0,12,12A12,12,0,0,0,92,116.0001Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116.0001Zm-72,68a12,12,0,1,0,12,12A12,12,0,0,0,92,184.0001Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184.0001Z"/>
    </svg>
  </div>
</div>
<div class="brower-card-content">
  <div class="cue-container">
    <label for="cue">${cuePre}:</label>
    <div name="cue" class="browser-cue" contenteditable=true>${cuePost}</div>
  </div>
  <div class="line-container">
    <label for="line">${linePre}:</label>
    <div name="line" class="browser-line" contenteditable=true>${linePost}</div>
  </div>
  <div class="browser-line-metadata">
    <textarea name="linenotes" class="browser-linenotes" placeholder="Add line notes">${item.notes}</textarea>
    <label>
      <input type="checkbox" name="starred" ${item.starred ? "checked" : ""}></input>
      Starred
    </label>
  </div>
</div>
`;
        container.appendChild(card);

        // Accordian expand/contract
        card.onclick = (event) => {
            if (event.target == null) {
                console.log("browserCardClick target is null");
                return;
            }
            if(!(event.target instanceof HTMLElement)) return;

            if (event.target.classList.contains("browser-card-view-toggle")) {
                card.classList.toggle("browser-card-squished");
            }
        }

        /*
        const sidebar = card.querySelector(".browser-card-sidebar");
        if (!(sidebar instanceof HTMLElement)) {
            throw new Error("Missing .browser-card-sidebar")
        }

        sidebar.onmousedown = (downEvent) => {
            if (downEvent.target == null) {
                return;
            }
            if (downEvent.target instanceof HTMLDivElement
                && downEvent.target.classList.contains("browser-card-view-toggle")) {
                return;
            }

            const rect = card.getBoundingClientRect();
            const offsetX = downEvent.clientX - rect.left;
            const offsetY = downEvent.clientY - rect.top;

            const ghostCard = () => {
                let ghost: HTMLElement|null = document.querySelector(".browser-card-drag-ghost");
                if (ghost == null) {
                    ghost = document.createElement("div");
                    ghost.classList.add("browser-card-drag-ghost");
                    ghost.style.width = `${rect.width}px`;
                    ghost.style.height = `${rect.height}px`;
                    const cardStyle = window.getComputedStyle(card);
                    ghost.style.marginTop = cardStyle.marginTop;
                    ghost.style.marginBottom = cardStyle.marginBottom;
                    container.insertBefore(ghost, card);
                }
                return ghost;

            }

            const ondrag = (e: MouseEvent) => {
                const ghost = ghostCard();
                card.style.position = 'absolute';
                card.style.top = (window.scrollY + e.clientY - offsetY) + 'px';
                card.style.left = (window.scrollX + e.clientX - offsetX) + 'px';
                const underMouse = document.elementsFromPoint(e.clientX, e.clientY);
                for (const element of underMouse) {
                    if (element != card && element.classList.contains("browser-card")) {
                        const newRect = element.getBoundingClientRect();
                        const oldRect = ghost.getBoundingClientRect();
                        const relativeY = e.clientY - newRect.y;
                        // Card under mouse we now want to move into
                        if (newRect.y > oldRect.y) {
                            if (relativeY > newRect.height - oldRect.height) {
                                container.replaceChild(ghost, element);
                                container.insertBefore(element, ghost);
                            }
                        } else {
                            if (relativeY < oldRect.height) {
                                container.insertBefore(ghost, element);
                            }
                        }
                        break;
                    }
                }
            }

            const dragend = (e: MouseEvent) => {
                window.removeEventListener('mousemove', ondrag);
                card.style.position = 'static';
                container.replaceChild(card, ghostCard());
            }

            window.addEventListener('mousemove', ondrag)
            window.addEventListener('mouseup', dragend)
        }
        */
    }

    MakeItemsDraggable(container);
}

function getLineData(id: number) {
    return lines.find(item => item.id == id);
}
