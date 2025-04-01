import { query } from "../util/dom.js";
import { Decks } from "../util/linesets.js";

/*** For syntax highlighting ***/
const html = (strings: TemplateStringsArray, ...values: any[]) => String.raw({ raw: strings }, ...values);

//-------------------------------------------
// Update line set selection menus on page load

const lineSetName = (id: number) => Decks().find(item => item.id == id)?.title;

const loadLineSets = () => {
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
  for (const { id, title } of Decks()) {
    content += html`
    <div class="line-set-row">
      <span class="lineset-name">${title}</span>
      <a href="#settings"
          data-review="${id}" onclick="event.preventDefault();"
          class="lineset-review">Review</a>
      <a href="#browser"
          data-browse="${id}" onclick="event.preventDefault();"
          class="lineset-edit">Browse</a>
    </div>`
  }
  lineSetListing.innerHTML = content;
  lineSetListing.onclick = async (e: Event) => {
    if (!(e.target instanceof HTMLElement)) return;
    {
      const lineset = e.target.getAttribute("data-browse");
      if (lineset) {
        const id = parseInt(lineset);
        const Browser = await import("./browser.js");
        Browser.SelectLineSet(id);
        location.hash = "#browser";
      }
    }
    {
      const lineset = e.target.getAttribute("data-review");
      if (lineset) {
        const LineReviewer = await import("./linereviewer.js");
        LineReviewer.SetLineSet(parseInt(lineset));
        location.hash = "#reviewer";
      }
    }
  }
;
}
loadLineSets();

//---------------------------------------------------------------
function homePageUpdate() {
  const content = document.getElementById("home-message");
  if (content == null) {
    throw new Error("Did not find #home-message");
  }
  import("./linereviewer.js").then(LineReviewer => {
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
  loadLineSets();
}

//--------------------------

query("#home-new-lineset-btn", HTMLElement).onclick = async () => {
  const { default: NewLineSetDialog } = await import("../organisms/NewLinesetDialog.js");
  NewLineSetDialog(async (_title, id) => {
    (await import("./browser.js")).SelectLineSet(id);
    location.href = "#browser";
  });
}

//-------------------------------------------
// Callbacks for when we switch to a sub-pages

function subpageLoad() {
  const current = query("#current-page", HTMLElement);
  console.log("subpageLoad()");
  switch (location.hash) {
    case "#home":
      current.innerText = "Home";
      homePageUpdate();
      break;
    case "#builder":
      current.innerText = "Builder";
      import("./builder.js")
      break;
    case "#browser":
      current.innerText = "My lines";
      import('./browser.js').then(BrowserPage => {
        BrowserPage.Init();
      });
      break;
    case "#reviewer":
      current.innerText = "Reviewer";
      import("./linereviewer.js").then(LineReviewer => {
        console.log(LineReviewer.GetReviewState().lineSet, LineReviewer.GetReviewState().reviewMethod)
        if (LineReviewer.GetReviewState().lineSet < 0) {
          location.hash = "#lineset-select";
        } else if (LineReviewer.GetReviewState().reviewMethod == "") {
          location.hash = "#settings";
        }
      });
      break;
    case "#lineset-select":
      current.innerText = "Selector";
      import("./deckselect.js");
      break;
    case "#settings":
      current.innerText = "Settings";
      import('./settings.js');
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
  import("./browser.js")
  import("./linereviewer.js")
  import("./settings.js")
}
