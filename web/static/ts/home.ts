import * as Save from "./save.js"

/*** For syntax highlighting ***/
const html = (strings: TemplateStringsArray, ...values: any[]) => String.raw({ raw: strings }, ...values);

/*** Callbacks for HTML ***/
declare global {
    interface Window { linesetSelected: Function, browseLineset: Function }
}


//-------------------------------------------
// Update line set selection menus on page load

declare let lineSets: string[]

const loadLineSets = (_lineSets: string[]) => {
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
        let content = ``;
        for (const lineSet of lineSets) {
            content += html`
<div class="line-set-row">
    <span class="lineset-name">${lineSet}</span>
    <a href="#settings"
        onclick="linesetSelected('${lineSet}')"
        class="lineset-review">Review</a>
    <a href="#browser"
        onclick="browseLineset('${lineSet}')"
        class="lineset-edit">Browse</a>
</div>`
        }
        lineSetListing.innerHTML = content;
    }

    { /*** Lineset selection ***/
        const container = document.getElementById("lineset-page-list");
        if (container === null) {
            throw new Error("Did not find #lineset-page-list");
        }
        let s = ``;
        for (const name of lineSets) { s += html`
<a class="button-thick"
   href="/#settings"
   onclick="linesetSelected('${name}')">
${name}</a>
`
        }
        container.innerHTML = s;

    }

    { /*** Browser ***/
        const container = document.getElementById("browser-line-select");
        if (container === null) {
            throw new Error("Did not find #browser-line-select");
        }
        let content = ``;
        for (const name of lineSets) {
            content += `
<option value="${name}">${name}</option>
`
        }
        container.innerHTML = content;
    }
}
loadLineSets(lineSets);

//---------------------------------------------------------------
function homePageUpdate() {
    const content = document.getElementById("home-message");
    if (content == null) {
        throw new Error("Did not find #home-message");
    }
    if (Save.state.lineSet != "") {
        const s = html`
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

//---------------------------------------------------------------
// lineset select page

import * as lineReviewer from "./linereviewer.js";

window.linesetSelected = (title: string) => {
    console.log("linesetSelected() " + title);
    lineReviewer.SetLineSet(title);

}

window.browseLineset = (title: string) => {
    const selector = document.getElementById("browser-line-select");
    if (!(selector instanceof HTMLSelectElement)) {
        throw new Error("missing #browser-line-select");
    }
    selector.value = title;
}
//--------------------------

//-------------------------------------------
// Callbacks for when we switch to a sub-pages

function subpageLoad() {
    console.log("subpageLoad()");
    switch (location.hash) {
        case "#home":
            homePageUpdate();
            break;
        case "#builder":
            break;
        case "#browser":
            import('./browser.js').then(BrowserPage => {
                BrowserPage.Init();
            })
            break;
        case "#lineset-select":
            break;
        case "#settings":
            break;
        default:
            console.log("Unknown subpage " + location.hash)
            break;
    }
}

addEventListener("hashchange", subpageLoad)
subpageLoad();
