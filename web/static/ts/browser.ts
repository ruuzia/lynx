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

function render(lines: Card[]) {
    const container = document.getElementById("browser-container");
    if (container === null) {
        throw new Error("Missing #browser-container");
    }
    let code = '';
    for (const item of lines) {
        code += html`
<div class="browser-card">
  <div class="line-container">
    <div class="line">${item.line}</div>
  </div>
  <div class="cue">${item.cue}</div>
</div>`
    }
    container.innerHTML = code;
}
