const headerText = document.getElementById("header")
const frontText = document.getElementById("front")
const revealButton = document.getElementById("revealbtn");
const revealText = document.getElementById("back");
const frontInputs = document.getElementById("front_inputs");
const backInputs = document.getElementById("back_inputs");
const starredCheck = document.getElementById("starred");
const notesText = document.getElementById("linenotes");

revealButton.addEventListener("click", () => {
    show_back = true;
    display()
});

let i = 0;
let show_back = false;
let is_starred = false;

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
    frontText.innerText = lineData[i].cue
    revealText.innerText = lineData[i].line
    headerText.innerText = "Line " + (lineData[i].id + 1)
    notesText.value = lineData[i].notes
    starred.checked = lineData[i].starred;

    revealText.hidden = !show_back;
    revealButton.hidden = show_back;
    frontInputs.hidden = show_back;
    backInputs.hidden = !show_back;
    frontText.style.setProperty("opacity", show_back ? 0.5 : 1.0);

    starred.onchange = async (e) => {
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

display()
