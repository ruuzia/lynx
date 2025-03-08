import * as Save from "./save.js"
const html = String.raw

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

function render(lines: Card[]) {
    const container = document.getElementById("browser-container");
    if (container === null) {
        throw new Error("Missing #browser-container");
    }
    let code = '';
    for (const item of lines) {
        const [linePre, linePost] = sepLine(item.line)
        const [cuePre, cuePost] = sepLine(item.cue)
        console.log(linePre, linePost);
        code += html`
<div class="browser-card">
  <div class="cue-container">
    <label for="cue">${cuePre}:</label>
    <div name="cue" class="browser-cue" contenteditable=true>${cuePost}</div>
  </div>
  <div class="line-container">
    <label for="line">${linePre}:</label>
    <div name="line" class="browser-line" contenteditable=true>${linePost}</div>
  </div>
</div>

`
    }
    container.innerHTML = code;
}
