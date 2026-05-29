/* ==========================================================
   DLS DASHBOARD JS
   Purpose:
   Small dashboard interactions for prototype.
========================================================== */

const dashboardClock = document.getElementById("dashboardClock");
const dashboardDate = document.getElementById("dashboardDate");

function updateDashboardClock() {
    const now = new Date();

    const timeText = now.toLocaleTimeString("he-IL", {
        hour: "2-digit",
        minute: "2-digit"
    });

    const dateText = now.toLocaleDateString("he-IL", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });

    dashboardClock.textContent = timeText;
    dashboardDate.textContent = dateText;
}

updateDashboardClock();
setInterval(updateDashboardClock, 1000);