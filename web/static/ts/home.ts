const lineSetListing : HTMLElement | null = document.getElementById("line-set-listing");
if (lineSetListing === null) {
    throw new Error("Could not find lineSetListing");
}
const container = document.getElementById("line-set-listing-container");
if (container === null) {
    throw new Error("Could not find lineSetListing container");
}

fetch("/feline/list-line-sets").then(resp => resp.json()).then(lineSets => {
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
