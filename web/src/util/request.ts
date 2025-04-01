/**
 * Wrapper around fetch to always check result so I don't forget.
 */
export default async function request(url: RequestInfo, opts?: RequestInit) {
    const res = await fetch(url, opts);
    if (!res.ok) {
        throw new Error(`Failed fetch for '${url}'`);
    }
    return await res.json();
}
