import * as Save from "./save.js"

//-------------------------------------------
// Callbacks for when we switch to a sub-pages

addEventListener("hashchange", (e) => {
    switch (location.hash) {
        case "#home":
            homePageUpdate();
            break;
        case "#builder":
            break;
        case "#lineset-select":
            break;
        case "#settings":
            break;
    }
})

//-------------------------------------------
// Update line set selection menus on page load

let lineSets: null | string[] = null

fetch("/feline/list-line-sets").then(resp => resp.json()).then((_lineSets: string[]) => {
    lineSets = _lineSets

    { /*** Home page listing ****/
        const container = document.getElementById("line-set-listing-container");
        if (container === null) {
            throw new Error("Could not find lineSetListing container");
        }
        const lineSetListing = document.getElementById("line-set-listing");
        if (lineSetListing === null) {
            throw new Error("Could not find lineSetListing");
        }

        container.hidden = false;
        let s = ``;
        for (const lineSet of lineSets) {
            s += `
<div class="line-set-row">
    <span class="lineset-name">${lineSet}</span>
    <a href="#settings"
       onclick="linesetSelected('${lineSet}')"
       class="lineset-review">Review</a>
    <a href="" class="lineset-edit">Browse</a>
</div>`
        }
        lineSetListing.innerHTML = s;
    }

    { /*** Lineset selection ***/
        const container = document.getElementById("lineset-page-list");
        if (container === null) {
            throw new Error("Did not find #lineset-page-list");
        }
        let s = ``;
        for (const name of lineSets) {
            s += `
<a class="button-thick"
   href="/#settings"
   onclick="linesetSelected('${name}')">
${name}</a>
`
        }
        container.innerHTML = s;
        
    }
})
//-------

//---------------------------------------------------------------
function homePageUpdate() {
    const content = document.getElementById("home-message");
    if (content == null) {
        throw new Error("Did not find #home-message");
    }
    if (Save.state.lineSet != "") {
        let s = `
<p>You're in the middle of reviewing <b>${Save.state.lineSet}</b>.</p>
<div class="center-content">
  <div class="button-wrap">
    <a href="#reviewer">Continue reviewing</a>
  </div>
</div>
`;
        content.innerHTML = s;
    }
}
homePageUpdate();

//---------------------------------------------------------------
// lineset select page

declare global {
    interface Window { linesetSelected: Function }
}

import * as lineReviewer from "./linereviewer.js";

window.linesetSelected = (title: string) => {
    console.log("linesetSelected() " + title);
    lineReviewer.SetLineSet(title);

}
//--------------------------
