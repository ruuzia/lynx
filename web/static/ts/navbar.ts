const sidebar = document.querySelector(".nav-container");
function sidebarToggle() {
    if (sidebar !== null) {
        sidebar.classList.toggle("docked")
    }
}
if (sidebar !== null) {
    if (screen.width > 500) {
        sidebar.classList.remove("docked")
    }
}
