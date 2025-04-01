import { html } from "../util/dom.js";
import { Decks } from "../util/LineSets.js";
{
    const container = document.getElementById("lineset-page-list");
    if (container === null) {
      throw new Error("Did not find #lineset-page-list");
    }
    let s = ``;
    for (const { id, title } of Decks()) {
      s += html`
<a class="button-thick"
  href="/#settings"
  data-review="${id}" onclick="event.preventDefault();">
  ${title}</a>
`
    }
    container.innerHTML = s;
    container.onclick = async (e) => {
      if (!(e.target instanceof HTMLElement)) return;
      const id = e.target.getAttribute("data-review");
      if (id) {
        const LineReviewer = await import("./linereviewer.js");
        LineReviewer.SetLineSet(parseInt(id));
      }
      location.hash = "#settings";
    };
  }
