interface DraggableListOptions {
    /**
     * Function called within the list element's mousedown event to
     * check if it is okay to start a drag here. Useful to check `e.target`
     * to blacklist/whitelist certain elements.
     */
    canDrag?: (e: MouseEvent) => boolean,
    onUpdated?: (oldIndex: number, newIndex: number, item: HTMLElement) => void,
};

/**
 * Given a container, implements a live drag and drop to support the reordering of elements
 * in place.
 */
export function MakeItemsDraggable(container: HTMLElement, options? : DraggableListOptions) {
    options ??= {};
    for (const [index, card] of Array.from(container.children).entries()) {
        if (!(card instanceof HTMLElement)) continue;
        card.onmousedown = (e) => {
            if (e.target == null) {
                return;
            }
            if (options.canDrag && !options.canDrag(e)) {
                return;
            }

            const cardRect = card.getBoundingClientRect();
            const offsetX = e.clientX - cardRect.left;
            const offsetY = Math.round(e.clientY - cardRect.top);
            console.log(`offsetY=${offsetY}`)

            // We don't want to create placeholder until after first dragMove car so construct lazily
            const getPlaceholder = () => {
                let placeholder: HTMLElement|null = container.querySelector(".dragging-placeholder");
                if (placeholder == null) {
                    placeholder = document.createElement("div");
                    placeholder.classList.add("dragging-placeholder");
                    placeholder.style.width = `${cardRect.width}px`;
                    placeholder.style.height = `${cardRect.height}px`;
                    const cardStyle = window.getComputedStyle(card);
                    placeholder.style.marginTop = cardStyle.marginTop;
                    placeholder.style.marginBottom = cardStyle.marginBottom;
                    container.insertBefore(placeholder, card);
                }
                return placeholder;

            }

            const dragMove = (e: MouseEvent) => {
                const placeholder = getPlaceholder();
                card.style.position = 'absolute';
                const top = e.clientY - offsetY;
                const left = e.clientX - offsetX;
                card.style.marginTop = '0';
                card.style.top = (window.scrollY + top) + 'px';
                card.style.left = (window.scrollX + left) + 'px';

                for (const element of document.elementsFromPoint(e.clientX, e.clientY)) {
                    if (element != card && element.parentElement == container) {
                        const newRect = element.getBoundingClientRect();
                        const oldRect = placeholder.getBoundingClientRect();
                        // Y position of mouse within element
                        const relativeY = e.clientY - newRect.y;

                        // Two cases: new location is *below* the current (placeholder) location
                        // or new location is *above* the placeholder location. 
                        if (newRect.y > oldRect.y) {
                            // We must also watch out for the case when the new spot is bigger than the
                            // element we're moving.
                            if (relativeY > newRect.height - oldRect.height) {
                                container.replaceChild(placeholder, element);
                                container.insertBefore(element, placeholder);
                            }
                        } else {
                            if (relativeY < oldRect.height) {
                                container.insertBefore(placeholder, element);
                            }
                        }
                        break;
                    }
                }
            }

            const dragEnd = (e: MouseEvent) => {
                window.removeEventListener('mousemove', dragMove);
                window.removeEventListener('mouseup', dragEnd);
                const placeholder = getPlaceholder();
                // Restore CSS state
                card.style.position = 'static';
                card.style.marginTop = placeholder.style.marginTop;
                card.style.removeProperty("top");
                card.style.removeProperty("left");
                container.replaceChild(card, placeholder);
                const newIndex = Array.from(container.children).indexOf(card);
                if (options.onUpdated) options.onUpdated(index, newIndex, card);
                return false;
            }

            window.addEventListener('mousemove', dragMove)
            window.addEventListener('mouseup', dragEnd)
        }
    }
}
