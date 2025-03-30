import { query, create } from "../util/dom.js";

const builder = query("#builder", HTMLDivElement)

// document.head.appendChild($create("link",
//     { rel: "stylesheet", href: "/static/style/builder.css" },
// ));

builder.innerHTML = `
<h1>Add your lines</h1>
<div style="width: min(100%, 650px); text-align: left; margin-left: auto; margin-right: auto;">
  <div>
    <label for="builder-title">Please provide a title:</label>
    <input name="title" id="builder-title" type="text" value=""/>
  </div>
  <div style="color: red;">
  </div>
  <div>
    Type up or paste your character's lines with their cues in the simple format shown.
  </div>
  <textarea id="builder-data" rows="20" cols="40" placeholder="RUFUS: This is Poco's cue
    POCO: My line

    RUFUS: Lines are separated by a blank space
    POCO: Another line
    "></textarea>
  <div>
    Status: <span>saving</span>
  </div>
  <form action="/feline/finishbuilder">
    <button id="builder-submit" style="width: 20em;">Create line set</button>
  </form>
  <form action=""> <button style="width: 20em;">Go back</button> </form>
</div>
`

const title = query("#builder-title", HTMLInputElement);
const data = query("#builder-data", HTMLTextAreaElement);
const submit = query("#builder-submit", HTMLButtonElement);

const update = async () => {
    const payload = {
        title: title.value,
        text: data.value
    };

    const response = await fetch('/feline/updatebuilder', {
        method: "POST",
        body: JSON.stringify(payload)
    });
};

title.oninput = update;
data.oninput = update;
