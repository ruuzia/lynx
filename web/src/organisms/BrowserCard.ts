import Dropdown from "../atoms/Dropdown.js";
import { create, html, query } from "../util/dom.js";

export default function(
  item: Card,
  opts: { onRequestAdd: Function; onUpdate: Function; onRemove: Function },
) {
  const card = create(
    "div",
    { classList: "card" },
    html`
<div class="card-flex">
  <div class="card-sidebar">
    <div class="card-view-toggle">﹀</div>
    <div class="card-mover clickable">
      <svg width="30px" height="30px" viewBox="0 0 256 256" id="Flat" xmlns="http://www.w3.org/2000/svg">
        <path d="M104,60.0001a12,12,0,1,1-12-12A12,12,0,0,1,104,60.0001Zm60,12a12,12,0,1,0-12-12A12,12,0,0,0,164,72.0001Zm-72,44a12,12,0,1,0,12,12A12,12,0,0,0,92,116.0001Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116.0001Zm-72,68a12,12,0,1,0,12,12A12,12,0,0,0,92,184.0001Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184.0001Z"/>
      </svg>
    </div>
    <div class="spacer"></div>

  </div>

  <div class="card-content">
    <div class="cue-container">
      ${renderCue(item.cue)}
    </div>
    <div class="line-container">
      ${renderLine(item.line)}
    </div>
    <div class="line-metadata">
      <textarea name="linenotes" class="linenotes" placeholder="Add line notes">${item.notes}</textarea>
      <label>
        <input class="starred" type="checkbox" name="starred" ${item.starred ? "checked" : ""}></input>
        Starred
      </label>
    </div>
  </div>
</div>
<div class="card-bottom-relative">
  <div class="card-bottom">
    <hr />
    <div class="card-bottom-items">
      <button class="card-add-btn">+ Add</button>

      <div class="menu-dropdown">
        <button class="dropdown-button card-menu-btn" aria-label="menu">︙ More</button>
        <div class="dropdown-options" hidden>
          <button class="dropdown-item card-remove-option" tabindex="-1">Remove card</button>
        </div>
      </div>
    </div>

  </div>
</div>
`,
  );

  card.addEventListener("focusin", (e) => {
    if (!(e.target instanceof HTMLElement)) return;
    if (e.target.classList.contains("cue-view")) {
      const cueContainer = query(".cue-container", HTMLElement, card);
      const cueEdit = create(
        "div",
        {
          className: "cue-edit",
          contentEditable: "true",
        },
        `${item.cue}`,
      );
      cueContainer.replaceChildren(cueEdit);
      cueEdit.focus();
      cueEdit.addEventListener("focusout", () => {
        cueContainer.innerHTML = renderCue(cueEdit.innerText);
        item.cue = cueContainer.innerText;
        onCardUpdate();
      });
    }

    if (e.target.classList.contains("line-view")) {
      const lineContainer = query(".line-container", HTMLElement, card);
      const lineEdit = create(
        "div",
        {
          className: "line-edit",
          contentEditable: "true",
        },
        `${item.line}`,
      );
      lineContainer.replaceChildren(lineEdit);
      lineEdit.focus();
      lineEdit.addEventListener("focusout", () => {
        lineContainer.innerHTML = renderLine(lineEdit.innerText);
        item.line = lineContainer.innerText;
        onCardUpdate();
      });
    }
  });

  // Accordian expand/contract
  card.addEventListener("click", (event) => {
    if (event.target == null) return;
    if (!(event.target instanceof HTMLElement)) return;

    if (event.target.classList.contains("card-view-toggle")) {
      card.classList.toggle("card-squished");
    }
    if (event.target.classList.contains("card-add-btn")) {
      opts.onRequestAdd(item.index);
      event.preventDefault();
    }

    if (event.target.classList.contains("card-menu-btn")) {
    }
  });

  const notes = query(".linenotes", HTMLTextAreaElement, card);
  const cue = query(".cue", HTMLDivElement, card);
  const line = query(".line", HTMLDivElement, card);
  const starred = query(".starred", HTMLInputElement, card);

  const onCardUpdate = async () => {
    item.notes = notes.value;
    item.starred = starred.checked;
    opts.onUpdate(item);
  };
  notes.addEventListener("input", onCardUpdate);
  cue.addEventListener("input", onCardUpdate);
  line.addEventListener("input", onCardUpdate);
  starred.addEventListener("input", onCardUpdate);

  Dropdown(query(".menu-dropdown", HTMLDivElement, card), (selected) => {
    if (selected.classList.contains("card-remove-option")) {
      opts.onRemove(item);
    }
  });

  return card;
}

function renderCue(line: string) {
  const [cuePre, cuePost] = sepLine(line);
  return `
<div class="cue-view" tabindex=0>
<label for="cue">${cuePre}</label>
<div name="cue" class="cue">${cuePost}</div>
</div>
`;
}
function renderLine(line: string) {
  const [linePre, linePost] = sepLine(line);
  return `
<div class="line-view" tabindex=0>
<label for="line">${linePre}</label>
<div name="line" class="line">${linePost}</div>
</div>
`;
}

function sepLine(line: string): [string, string] {
  const sepIndex = line.indexOf(":");
  if (sepIndex == -1) return ["", line];
  return [line.slice(0, sepIndex + 1), line.slice(sepIndex + 1, line.length)];
}
