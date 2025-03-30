import { query } from "../util/dom.js";
import Persist from "../persist.js";

const save = Persist("linereviewer", {
  lineSet: -1,
  reviewMethod: "",
  i: 0,
});

export function GetReviewState() {
    return save;
}

const reviewer = query("#reviewer", HTMLDivElement);
reviewer.innerHTML = `
<link rel="stylesheet" href="/static/style/reviewer.css"></link>
<div id="card">
  <div class="content">
    <h2 id="header"></h2>
    <div id="front"></div>
    <div id="back" hidden></div>
  </div>

  <div id="front_inputs">
    <div><button type="button" id="revealbtn">Reveal</button></div>
    <div id="submitform" hidden>
      <div><button type="button" name="action" value="back" id="backbtn" onclick="previousLine()">Back</button></div>
    </div>
  </div>

  <div id="back_inputs">
    <div><button type="button" name="action" value="continue" id="continuebtn" onclick="nextLine()">Continue</button></div>

    <div style="text-align: left;">
      <input type="checkbox" name="starred" id="starred"></input>
      <label for="starred">Starred</label>
    </div>

    <textarea rows="5" cols="30" name="linenotes" id="linenotes" placeholder="Add line notes"></textarea>

  </div>
</div>

<form action="/#home">
  <button style="width: var(--card-width); border-color: var(--fg); border-width: 1px;">Home</button>
</form>
`

var lineData: Card[] | null;

const default_front_fn = (item: Card) => item.cue;
const default_back_fn = (item: Card) => item.line;
const default_header_fn = (item: Card) => "Line " + (item.index + 1);

let show_back = false;
let is_starred = false;
let header_fn = default_header_fn
let front_fn = default_front_fn
let back_fn = default_back_fn

declare global {
    interface Window { nextLine: Function, previousLine: Function }
}

window.nextLine = () => {
    if (lineData !== null && save.i + 1 < lineData.length) {
        ++save.i;
        show_back = false;
        display()
    }
}

window.previousLine = () => {
    if (save.i > 0) {
        --save.i;
        show_back = false;
        display()
    }
}

function display() {
    if (lineData == null) {
        throw new Error("Missing line data");
    }
    const notesText = document.getElementById("linenotes");
    if (!(notesText instanceof HTMLTextAreaElement)) {
        throw new Error("Missing linenotes");
    }
    const starredCheck = document.getElementById("starred");
    if (!(starredCheck instanceof HTMLInputElement)) {
        throw new Error("Missing starredCheck");
    }
    const revealButton = document.getElementById("revealbtn");
    if (!(revealButton instanceof HTMLButtonElement)) {
        throw new Error("Missing revealbtn");
    }
    const headerText = document.getElementById("header")!;
    const frontText = document.getElementById("front")!;
    const revealText = document.getElementById("back")!;
    const frontInputs = document.getElementById("front_inputs")!;
    const backInputs = document.getElementById("back_inputs")!;

    const item = lineData[save.i];
    frontText.innerText = front_fn(item);
    revealText.innerText = back_fn(item);
    headerText.innerText = header_fn(item);
    notesText.value = item.notes
    starredCheck.checked = item.starred;

    revealText.hidden = !show_back;
    revealButton.hidden = show_back;
    frontInputs.hidden = show_back;
    backInputs.hidden = !show_back;
    frontText.style.setProperty("opacity", show_back ? "0.5" : "1.0");

    const updateLine = async () => {
        const result = await fetch(`/feline/items/${item.id}`, {
            method: "PUT",
            body: JSON.stringify(item),
        });
        if (!result.ok) {
            const body = await result.text();
            console.log("Failed updating line ", result.statusText, body)
        }
    };

    starredCheck.onchange = async () => {
        console.log("starred.onchange");
        item.starred = starredCheck.checked;
        await updateLine();
    };

    notesText.oninput = async () => {
        console.log("notesText.oninput")
        item.notes = notesText.value,
        await updateLine();
    }

    revealButton.onclick = () => {
        show_back = true;
        display()
    };

}

let fetchTask: null|Promise<any> = null

export function SetReviewMethod(_reviewMethod: string) {
    save.reviewMethod = _reviewMethod;
    if (lineData == null) {
        if (fetchTask === null) {
            throw new Error("called SetReviewMethod without line data");
        }
        fetchTask.then(() => SetReviewMethod(_reviewMethod));
        return;
    }

    console.log("init() " + save.reviewMethod);
    front_fn = default_front_fn;
    back_fn = default_back_fn;
    header_fn = default_header_fn;
    switch (save.reviewMethod) {
    case "in_order":
        break;
    case "random":
        // Quick and dirty shuffle... improve me?
        for (let i = 0; i < lineData.length; i++) {
            const n = Math.floor(Math.random() * lineData.length);
            lineData[i] = lineData[n];
        }
        break;
    case "cues":
        front_fn = item => item.line;
        back_fn = item => item.cue;
        break;
    case "no_cues":
        front_fn = _ => "";
        back_fn = item => item.line;
        break;
    }
    display();
}

export function SetLineSet(id: number) {
    console.log("SetLineSet " + id)
    if (fetchTask !== null) {
        // Wait for current fetch to complete
        fetchTask.then(() => {
            fetchTask = null;
            SetLineSet(id);
        });
        return;
    }

    if (lineData === null || id != save.lineSet) {
        save.lineSet = id;
        save.i = 0;
    }

    fetchTask = loadLineData(id);
}

async function loadLineData(id: number) {
    try {
        const resp = await fetch(`/feline/linesets/${id}/items`, {
            method: "GET",
        });
        if (!resp.ok) {
            throw new Error("Failed to fetch line data: " + await resp.text());
        }
        lineData = await resp.json();
    } catch (err) {
        console.error(err);
    }
}

function onload() {
    if (save.lineSet != -1) {
        SetLineSet(save.lineSet)
        if (save.reviewMethod != "") {
            SetReviewMethod(save.reviewMethod);
        }
    }
}
onload();
