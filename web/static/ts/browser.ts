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

        card.onclick = (event) => {
            if (event.target == null) {
                console.log("browserCardClick target is null");
                return;
            }
            if(!(event.target instanceof HTMLElement)) return;

            if (event.target.classList.contains("browser-card-view-toggle")) {
                card.classList.toggle("browser-card-squished");
                // const data = getLineData(id)
            }
        }
    }
}

function getLineData(id: number) {
    return lines.find(item => item.id == id);
}
