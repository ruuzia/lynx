const title = document.getElementById("title")! as HTMLInputElement;
const data = document.getElementById("data")! as HTMLTextAreaElement;
const submit = document.getElementById("submit")! as HTMLButtonElement;

const update = async () => {
    const payload = {
        title: title.value,
        text: data.value
    };

    const response = await fetch('/feline/updatebuilder', {
        method: "POST",
        body: JSON.stringify(payload)
    });
};

title.oninput = update;
data.oninput = update;
