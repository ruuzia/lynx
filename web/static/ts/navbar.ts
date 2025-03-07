const sidebar = document.querySelector(".nav-container");
function sidebarToggle() {
    if (sidebar !== null) {
        sidebar.classList.toggle("docked")
    }
}
if (sidebar !== null) {
    if (screen.width > 500) {
        // Disabling automatic showing animation for now
        //sidebar.classList.remove("docked")
    }
}
