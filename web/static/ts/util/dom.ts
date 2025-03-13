/**
 * Lightweight wrapper around document.createElement.
 * @param type: type of HTML element
 * @param props?: optional dictionary of properties
 * @param children?: optional array of children elements OR innerHTML
 */
export function $create<K extends keyof HTMLElementTagNameMap>(type: K, props?: Object, children?: Node[]|string): HTMLElementTagNameMap[K] {
    const elem = document.createElement(type);
    for (const [k, v] of Object.entries(props ?? {})) {
        (elem as any)[k] = v;
    }
    if (typeof children == 'string') {
        elem.innerHTML = children;
    } else {
        for (const child of children ?? []) {
            elem.appendChild(child);
        }
    }
    return elem;
}

/**
 * Lightweight wrapper around document.querySelector with type checking.
 * @param query argument to querySelector
 * @param type (e.g. HTMLSelectElement)
 */
export function $query<T extends Element>(query: string, type: new() => T): T {
    const elem = document.querySelector(query);
    if (elem == null) {
        throw new Error(`$query failed to find ${query}`);
    }
    if (!(elem instanceof type)) {
        throw new Error(`$query ${query} expected ${type}`);
    }
    return elem;
}
