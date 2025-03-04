const headerText = document.getElementById("header")!;
const frontText = document.getElementById("front")!;
const revealButton = document.getElementById("revealbtn")!;
const revealText = document.getElementById("back")!;
const frontInputs = document.getElementById("front_inputs")!;
const backInputs = document.getElementById("back_inputs")!;
const starredCheck = document.getElementById("starred")!;
const notesText = document.getElementById("linenotes")! as HTMLInputElement;

revealButton.addEventListener("click", () => {
    show_back = true;
    display()
});

interface Card {
    cue: string;
    line: string;
    notes: string;
    id: number;
}

let i = 0;
let show_back = false;
let is_starred = false;
let default_front_fn = (item: Card) => item.cue;
let default_back_fn = (item: Card) => item.line;
let default_header_fn = (item: Card) => "Line " + (item.id + 1);
let header_fn = default_header_fn
let front_fn = default_front_fn
let back_fn = default_back_fn

declare var lineData: Card[];
declare var reviewMethod: string;

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
    frontText.innerText = front_fn(lineData[i]);
    revealText.innerText = back_fn(lineData[i]);
    headerText.innerText = header_fn(lineData[i]);
    notesText.value = lineData[i].notes
    starredCheck.checked = lineData[i].starred;

    revealText.hidden = !show_back;
    revealButton.hidden = show_back;
    frontInputs.hidden = show_back;
    backInputs.hidden = !show_back;
    frontText.style.setProperty("opacity", show_back ? 0.5 : 1.0);

    starredCheck.onchange = async (e) => {
        console.log("starred.onchange");
        const payload = {
            "line": i,
            "starred": e.target.checked,
        };
        const result = await fetch("/feline/starline", {
            method: "POST",
            body: JSON.stringify(payload)
        });
        console.log(result);
    };

    notesText.oninput = async (e) => {
        console.log("notesText.oninput")
        const payload = {
            "line": i,
            "text": e.target.value,
        }
        await fetch("/feline/linenotes", {
            method: "POST",
            body: JSON.stringify(payload)
        })
        
    }
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
        front_fn = item => "";
        back_fn = item => item.line;
        break;
    }
}

init();

display();
