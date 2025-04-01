/// Makes dropdwon interactable and accessible

import { query } from "../util/dom.js";

export default function(
  container: HTMLElement,
  onselect?: (option: Element) => void,
) {
  const isDropdownItem = (elem: Node | EventTarget | null) =>
    elem != null &&
    elem instanceof HTMLElement &&
    elem.classList.contains("dropdown-item");
  const isDropdownButton = (elem: Node | EventTarget | null) =>
    elem instanceof HTMLElement && elem.classList.contains("dropdown-button");

  container.onclick = (e) => {
    const options = query(".dropdown-options", HTMLElement, container);

    if (isDropdownButton(e.target)) {
      options.hidden = !options.hidden;
      // Prevent event from reaching window listener
      e.stopPropagation();
    } else if (isDropdownItem(e.target)) {
      options.hidden = true;
      if (onselect) onselect(e.target as HTMLElement);
    }
  };

  // Close on click outside
  container.addEventListener("focusout", (e) => {
    if (
      !isDropdownItem(e.relatedTarget) &&
      !isDropdownButton(e.relatedTarget)
    ) {
      query(".dropdown-options", HTMLElement, container).hidden = true;
    }
  });

  container.onkeydown = (e) => {
    if (!(e.target instanceof HTMLElement)) return;
    const options = query(".dropdown-options", HTMLElement, container);

    if (isDropdownButton(e.target) && (e.key == " " || e.key == "Enter")) {
      options.hidden = !options.hidden;
      return false;
    } else if (isDropdownItem(e.target) && (e.key == " " || e.key == "Enter")) {
      e.target.click();
      return false;
    }

    if (e.key == "ArrowUp" || e.key == "ArrowDown") {
      if (isDropdownButton(e.target)) {
        // Focus first dropdown item
        (
          options.children[
            e.key == "ArrowDown" ? 0 : options.children.length - 1
          ] as HTMLElement
        ).focus();
      } else if (isDropdownItem(e.target)) {
        if (e.key == "ArrowUp") {
          (e.target == options.children[0]
            ? (options.children[options.children.length - 1] as HTMLElement)
            : (e.target.previousElementSibling as HTMLElement)
          ).focus();
        }
        if (e.key == "ArrowDown") {
          (e.target == options.children[options.children.length - 1]
            ? (options.children[0] as HTMLElement)
            : (e.target.nextElementSibling as HTMLElement)
          ).focus();
        }
      }
      return false;
    }

    if (e.key == "Escape") {
      options.hidden = true;
      return false;
    }
  };
  return container;
}
