import * as Save from "./save.js"

/*** For syntax highlighting ***/
const html = (strings: TemplateStringsArray, ...values: any[]) => String.raw({ raw: strings }, ...values);

/*** Callbacks for HTML ***/
declare global {
    interface Window { linesetSelected: Function, browseLineset: Function }
}

//-------------------------------------------
// Update line set selection menus on page load

declare let lineSets: DeckInfo[]

const loadLineSets = (_lineSets: DeckInfo[]) => {
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
        for (const {title} of lineSets) {
            content += html`
<div class="line-set-row">
    <span class="lineset-name">${title}</span>
    <a href="#settings"
        onclick="linesetSelected('${title}')"
        class="lineset-review">Review</a>
    <a href="#browser"
        onclick="browseLineset('${title}')"
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


window.linesetSelected = (title: string) => {
    console.log("linesetSelected() " + title);
    import("./pages/linereviewer.js").then(lineReviewer => {
        lineReviewer.SetLineSet(title);
    });

}

window.browseLineset = (title: string) => {
    import("./pages/browser.js").then(Browser => {
        Browser.SelectLineSet(title)
    });
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
            import("./pages/builder.js")
            break;
        case "#browser":
            import('./pages/browser.js').then(BrowserPage => {
                BrowserPage.UpdateLineSets(lineSets);
                BrowserPage.Init();
            });
            break;
        case "#reviewer":
            import("./pages/linereviewer.js");
            break;
        case "#lineset-select":
            break;
        case "#settings":
            import('./pages/settings.js');
            break;
        default:
            console.log("Unknown subpage " + location.hash);
            break;
    }
}

addEventListener("hashchange", subpageLoad)
subpageLoad();


//--------------------------------
window.onload = () => {
  // After the home page is 100% loaded, asynchronously load other subpages
  import("./pages/browser.js")
  import("./pages/linereviewer.js")
  import("./pages/settings.js")
}
