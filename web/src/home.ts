import { query } from "./util/dom.js";
import newlinesetdialog from "./util/newlinesetdialog.js";

/*** For syntax highlighting ***/
const html = (strings: TemplateStringsArray, ...values: any[]) => String.raw({ raw: strings }, ...values);

/*** Callbacks for HTML ***/
declare global {
  interface Window { linesetSelected: Function, browseLineset: Function }
}

//-------------------------------------------
// Update line set selection menus on page load

declare let lineSets: DeckInfo[]
const lineSetName = (id: number) => lineSets.find(item => item.id == id)?.title;

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
    for (const { id, title } of lineSets) {
      content += html`
<div class="line-set-row">
    <span class="lineset-name">${title}</span>
    <a href="#settings"
        onclick="linesetSelected('${id}')"
        class="lineset-review">Review</a>
    <a href="#browser"
        onclick="browseLineset(${id})"
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
    for (const { id, title } of lineSets) {
      s += html`
<a class="button-thick"
   href="/#settings"
   onclick="linesetSelected('${id}')">
${title}</a>
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
  import("./pages/linereviewer.js").then(LineReviewer => {
    const state = LineReviewer.GetReviewState();
    if (state.lineSet != -1) {
      const s = html`
<p>You're in the middle of reviewing <b>${lineSetName(state.lineSet)}</b>.</p>
<div class="center-content">
  <div class="button-wrap">
    <a href="#reviewer">Continue reviewing</a>
  </div>
</div>
`;
      content.innerHTML = s;
    }
  });

  pullLineSets();
}

async function pullLineSets() {
  const res = await fetch("/feline/linesets", {
    method: "GET",
  });
  if (!res.ok) {
    throw new Error("Failed to load lineset info: " + await res.text());
  }
  const sets = await res.json();
  if (sets != null) {
    loadLineSets(sets);
  }
}

//---------------------------------------------------------------
// lineset select page


window.linesetSelected = (id: number) => {
  import("./pages/linereviewer.js").then(lineReviewer => {
    lineReviewer.SetLineSet(id);
  });

}

window.browseLineset = (id: number) => {
  import("./pages/browser.js").then(Browser => {
    const item = lineSets.find(item => item.id == id);
    if (item == null) {
      throw new Error("No lineset with id " + id);
    }
    Browser.UpdateLineSets(lineSets)
    Browser.SelectLineSet(item);
  });
}
//--------------------------

query("#home-new-lineset-btn", HTMLElement).onclick = async () => {
  const { default: NewLineSetDialog } = await import("./util/newlinesetdialog.js");
  NewLineSetDialog(async (_title, id) => {
    await pullLineSets();
    window.browseLineset(id);
    location.href = "#browser";
  });
}

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
      import("./pages/linereviewer.js").then(LineReviewer => {
        console.log(LineReviewer.GetReviewState().lineSet, LineReviewer.GetReviewState().reviewMethod)
        if (LineReviewer.GetReviewState().lineSet < 0) {
          location.hash = "#lineset-select";
        } else if (LineReviewer.GetReviewState().reviewMethod == "") {
          location.hash = "#settings";
        }
      });
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
