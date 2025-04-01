import { query } from "./util/dom.js";

const sidebar = query(".nav-container", HTMLElement);
query(".sidebar-toggle", HTMLElement).onclick = () => {
  sidebar.classList.toggle("docked")
}
if (sidebar !== null) {
    if (screen.width > 500) {
        // Disabling automatic showing animation for now
        //sidebar.classList.remove("docked")
    }
}

for (const item of document.querySelectorAll(".sidebar-item a")) {
  if (item instanceof HTMLElement) {
    item.onclick = () => {
      setTimeout(() => sidebar.classList.add("docked"), 150);
    }
  }
}
