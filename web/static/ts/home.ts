const lineSetListing : HTMLElement | null = document.getElementById("line-set-listing");
if (lineSetListing === null) {
    throw new Error("Could not find lineSetListing");
}
const container = document.getElementById("line-set-listing-container");
if (container === null) {
    throw new Error("Could not find lineSetListing container");
}

let lineSets: null | string[] = null

fetch("/feline/list-line-sets").then(resp => resp.json()).then(_lineSets => {
    lineSets = _lineSets
    if (lineSets == null) {
        throw new Error("missing lineSets!");
    }
    container.hidden = false;
    let s = ``;
    for (const lineSet of lineSets) {
        s += `<div class="line-set-row">
    <span class="lineset-name">${lineSet}</span>
    <a href="/session" class="lineset-review">Review</a>
    <a href="" class="lineset-edit">Explore</a>
        </div>`
    }
    lineSetListing.innerHTML = s;
})

let builderDoc: any | Document = null;
fetch('/builder').then(resp => resp.text()).then(content => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");
    builderDoc = doc;
});

function openBuilder(e: Event) {
    const mainBody = document.getElementById("main-content");
    if (mainBody == null) {
        throw new Error("Failed to find #main-content");
    }
    if (builderDoc !== null) {
        mainBody.innerHTML = builderDoc.body.innerHTML;
    }
    //e.preventDefault();
}

//---------------------------------------------------------------
// lineset select page

declare global {
    interface Window { linesetSelectPage: Function, linesetSelected: Function }
}

window.linesetSelectPage = () => {
    if (lineSets === null) {
        // TODO: wait for fetch to complete
        throw new Error("Did not fetch lineSets");
    }
    const container = document.getElementById("lineset-page-list");
    if (container === null) {
        throw new Error("Did not find #lineset-page-list");
    }
    let s = ``;
    for (const name of lineSets) {
        s += `
          <a class="button-thick" href="/#settings" onclick="linesetSelected('${name}')">${name}</a>
        `
    }
    container.innerHTML = s;
}

//---------------------------------------------------------------

import * as lineReviewer from "./linereviewer.js";

window.linesetSelected = (title: string) => {
    console.log("linesetSelected() " + title);
    lineReviewer.SetLineSet(title);

}

//--------------------------
