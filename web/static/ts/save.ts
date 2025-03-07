/**
 * Session state syncing with server.
 */

interface SessionState {
    lineSet: string,
    reviewMethod: string,
};

declare var initialSessionState: SessionState
export const state: SessionState = initialSessionState;


console.log("[state.ts] load state: ", state);

let pullRequest: null|Promise<any> = null;
export function PullState() {
    if (pullRequest == null) {
        pullRequest = fetch("/feline/pull-session-state", {
            method: "POST"
        })
            .then(resp => resp.json())
            .then((data: SessionState) => {
                console.log("pulled:", data);
                for (const [k, v] of Object.entries(data)) {
                    if (v != (state as any)[k]) {
                        console.log(`[save] Updating ${k} from ${(state as any)[k]} to ${v}`);
                        (state as any)[k] = v;
                    }
                }
                pullRequest = null;
                return data;
            })
            .catch(err => {
                pullRequest = null;
                console.log(err)
            })
        ;
    }
    return pullRequest;
}

let pushRequest: null|Promise<any> = null;
export function PushState() {
    if (pushRequest == null) {
        pushRequest = fetch("/feline/push-session-state", {
            method: "POST",
            body: JSON.stringify(state),
        })
            .then((ret) => {
                console.log("PushState", ret.status, ret.statusText);
                pushRequest = null;
            }).catch(err => {
                console.log(err);
            })
    }
    return pushRequest;
}
