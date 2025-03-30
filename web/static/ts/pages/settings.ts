import { SetReviewMethod } from "./linereviewer.js"
import * as Save from "../save.js"

export const settings = {
    reviewMethod: null,
};

const reviewStrategies = [
    {
        id: "in_order",
        title: "In order",
        description: "Review lines in order"
    },
    {
        id: "random",
        title: "Random order",
        description: "Review lines in order"
    },
    {
        id: "cues",
        title: "Cues from lines",
        description: "Difficult: recall cues from lines"
    },
    {
        id: "no_cues",
        title: "No cues",
        description: "Advanced: recall lines onlyl based on order"
    },
];

function init() {
    const settingsList = document.getElementById("settings-strategy-list");
    if (settingsList === null) {
        throw new Error("Missing #settings-strategy-list");
    }

    let s = ``;
    for (const { id, title, description } of reviewStrategies) {
        s += `
<a class="button-thick"
   href="/#reviewer"
   onclick="selectReviewType('${id}')">
${title}
</a>
        `;
    }
    settingsList.innerHTML = s;
}

declare global {
    interface Window { selectReviewType : Function }
}

window.selectReviewType = (type: string) => {
    SetReviewMethod(type);
}

init();
