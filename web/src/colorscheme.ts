const setting = localStorage.getItem("colorscheme");
if (setting !== null) {
    document.body.classList.add(setting);
} else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.body.classList.add("dark");
} else {
    document.body.classList.add("light");
}

// eslint-disable-line
(window as any).toggleTheme = () => {
    if (document.body.classList.contains("dark")) {
        document.body.classList.remove("dark");
        document.body.classList.add("light");
        localStorage.setItem("colorscheme", "light");
    } else {
        document.body.classList.remove("light");
        document.body.classList.add("dark");
        localStorage.setItem("colorscheme", "dark");
    }
}
