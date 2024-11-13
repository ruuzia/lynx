const title = document.getElementById("title");
const data = document.getElementById("data");
const submit = document.getElementById("submit")

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
