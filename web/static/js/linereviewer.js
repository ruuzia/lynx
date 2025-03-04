"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const headerText = document.getElementById("header");
const frontText = document.getElementById("front");
const revealButton = document.getElementById("revealbtn");
const revealText = document.getElementById("back");
const frontInputs = document.getElementById("front_inputs");
const backInputs = document.getElementById("back_inputs");
const starredCheck = document.getElementById("starred");
const notesText = document.getElementById("linenotes");
revealButton.addEventListener("click", () => {
    show_back = true;
    display();
});
let i = 0;
let show_back = false;
let is_starred = false;
let default_front_fn = (item) => item.cue;
let default_back_fn = (item) => item.line;
let default_header_fn = (item) => "Line " + (item.id + 1);
let header_fn = default_header_fn;
let front_fn = default_front_fn;
let back_fn = default_back_fn;
function nextLine() {
    if (i < lineData.length) {
        ++i;
        show_back = false;
        display();
    }
}
function previousLine() {
    if (i > 0) {
        --i;
        show_back = false;
        display();
    }
}
function display() {
    frontText.innerText = front_fn(lineData[i]);
    revealText.innerText = back_fn(lineData[i]);
    headerText.innerText = header_fn(lineData[i]);
    notesText.value = lineData[i].notes;
    starred.checked = lineData[i].starred;
    revealText.hidden = !show_back;
    revealButton.hidden = show_back;
    frontInputs.hidden = show_back;
    backInputs.hidden = !show_back;
    frontText.style.setProperty("opacity", show_back ? 0.5 : 1.0);
    starred.onchange = (e) => __awaiter(this, void 0, void 0, function* () {
        console.log("starred.onchange");
        const payload = {
            "line": i,
            "starred": e.target.checked,
        };
        const result = yield fetch("/feline/starline", {
            method: "POST",
            body: JSON.stringify(payload)
        });
        console.log(result);
    });
    notesText.oninput = (e) => __awaiter(this, void 0, void 0, function* () {
        console.log("notesText.oninput");
        const payload = {
            "line": i,
            "text": e.target.value,
        };
        yield fetch("/feline/linenotes", {
            method: "POST",
            body: JSON.stringify(payload)
        });
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
            front_fn = item => "";
            back_fn = item => item.line;
            break;
    }
}
init();
display();
