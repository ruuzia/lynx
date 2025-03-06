interface Card {
    cue: string;
    line: string;
    notes: string;
    id: number;
    starred: boolean;
}

var lineData: Card[] | null;
var reviewMethod: string | null;

const default_front_fn = (item: Card) => item.cue;
const default_back_fn = (item: Card) => item.line;
const default_header_fn = (item: Card) => "Line " + (item.id + 1);

let i = 0;
let show_back = false;
let is_starred = false;
let header_fn = default_header_fn
let front_fn = default_front_fn
let back_fn = default_back_fn

function nextLine() {
    if (lineData !== null && i < lineData.length) {
        ++i;
        show_back = false;
        display()
    }
}

function previousLine() {
    if (i > 0) {
        --i;
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

    frontText.innerText = front_fn(lineData[i]);
    revealText.innerText = back_fn(lineData[i]);
    headerText.innerText = header_fn(lineData[i]);
    notesText.value = lineData[i].notes
    starredCheck.checked = lineData[i].starred;

    revealText.hidden = !show_back;
    revealButton.hidden = show_back;
    frontInputs.hidden = show_back;
    backInputs.hidden = !show_back;
    frontText.style.setProperty("opacity", show_back ? "0.5" : "1.0");

    starredCheck.onchange = async () => {
        console.log("starred.onchange");
        const payload = {
            "line": i,
            "starred": starredCheck.checked,
        };
        const result = await fetch("/feline/starline", {
            method: "POST",
            body: JSON.stringify(payload)
        });
        if (result.status != 200) {
            const body = await result.text();
            console.log("Failed to setting note ", result.statusText, body)
        }
    };

    notesText.oninput = async () => {
        console.log("notesText.oninput")
        const payload = {
            "line": i,
            "text": notesText.value,
        }
        const result = await fetch("/feline/linenotes", {
            method: "POST",
            body: JSON.stringify(payload)
        })
        if (result.status != 200) {
            const body = await result.text();
            console.log("Failed to setting note ", result.statusText, body)
        }
    }

    revealButton.addEventListener("click", () => {
        show_back = true;
        display()
    });

}

function init(_reviewMethod: string, _lineData: Card[]) {
    reviewMethod = _reviewMethod;
    lineData = _lineData;
    console.log("init() " + reviewMethod);
    front_fn = default_front_fn;
    back_fn = default_back_fn;
    header_fn = default_header_fn;
    switch (reviewMethod) {
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
