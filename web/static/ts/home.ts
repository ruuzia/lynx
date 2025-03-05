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
        s += `
    <span class="lineset-name">${lineSet}</span>
    <button class="lineset-review">Review</button>
    <button lineset-edit>Explore</button>
        `
    }
    lineSetListing.innerHTML = s;
})
