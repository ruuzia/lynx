/**
 * Given a container, implements a live drag and drop to support the reordering of elements
 * in place.
 */
export function MakeItemsDraggable(container: HTMLElement) {
    for (const card of container.children) {
        if (!(card instanceof HTMLElement)) continue;
        card.onmousedown = (e) => {
            if (e.target == null) {
                return;
            }
            if (e.target instanceof HTMLDivElement
                && e.target.classList.contains("browser-card-view-toggle")) {
                return;
            }

            const cardRect = card.getBoundingClientRect();
            const offsetX = e.clientX - cardRect.left;
            const offsetY = e.clientY - cardRect.top;

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
                card.style.top = (window.scrollY + e.clientY - offsetY) + 'px';
                card.style.left = (window.scrollX + e.clientX - offsetX) + 'px';

                for (const element of document.elementsFromPoint(e.clientX, e.clientY)) {
                    if (element != card && element.classList.contains("browser-card")) {
                        const newRect = element.getBoundingClientRect();
                        const oldRect = placeholder.getBoundingClientRect();
                        const relativeY = e.clientY - newRect.y;
                        // Card under mouse we now want to move into
                        if (newRect.y > oldRect.y) {
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

            const dragEnd = () => {
                window.removeEventListener('mousemove', dragMove);
                window.removeEventListener('mouseup', dragEnd);
                card.style.position = 'static';
                container.replaceChild(card, getPlaceholder());
            }

            window.addEventListener('mousemove', dragMove)
            window.addEventListener('mouseup', dragEnd)
        }
    }
}
