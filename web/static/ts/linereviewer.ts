interface Card {
    cue: string;
    line: string;
    notes: string;
    id: number;
    starred: boolean;
}

declare var lineData: Card[];
declare var reviewMethod: string;

let i = 0;
let show_back = false;
let is_starred = false;
const default_front_fn = (item: Card) => item.cue;
const default_back_fn = (item: Card) => item.line;
const default_header_fn = (item: Card) => "Line " + (item.id + 1);
let header_fn = default_header_fn
let front_fn = default_front_fn
let back_fn = default_back_fn

function nextLine() {
    if (i < lineData.length) {
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
    const notesText = document.getElementById("linenotes");
    if (!(notesText instanceof HTMLInputElement)) {
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
        console.log(result);
    };

    notesText.oninput = async () => {
        console.log("notesText.oninput")
        const payload = {
            "line": i,
            "text": notesText.value,
        }
        await fetch("/feline/linenotes", {
            method: "POST",
            body: JSON.stringify(payload)
        })
    }

    revealButton.addEventListener("click", () => {
        show_back = true;
        display()
    });

}

function init() {
    console.log("init() " + reviewMethod);
    front_fn = item => item.cue;
    back_fn = item => item.line;
    header_fn = item => "Line " + (item.id + 1);
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
}

init();

display();
