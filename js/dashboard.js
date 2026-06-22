// Dor Mandel :       ID: 315313825
// Yotam Weintraub:   ID: 321610859

/* ==========================================================
   DLS DASHBOARD JS
   ---------------------------------------------------------
   Lecturer dashboard interactions:
   - Clock/date
   - Current user rendering
   - Logout/session cleanup
========================================================== */

const DASHBOARD_CONFIG = {
    STORAGE_KEYS: {
        CURRENT_USER: "dlsCurrentUser",
        REMEMBER_EMAIL: "dlsRememberEmail",
        PENDING_EFFECT: "dlsPendingEffect"
    },

    ROUTES: {
        LOGIN: "login.html"
    },

    SELECTORS: {
        CLOCK: "#dashboardClock",
        DATE: "#dashboardDate",
        USER_NAME: "#dashboardUserName",
        USER_ROLE: "#dashboardUserRole",
        LOGOUT_BUTTON: "[data-auth-action='logout']"
    }
};

/* ==========================================================
   CLOCK + DATE
========================================================== */

function updateDashboardClock() {
    const dashboardClock = document.querySelector(DASHBOARD_CONFIG.SELECTORS.CLOCK);
    const dashboardDate = document.querySelector(DASHBOARD_CONFIG.SELECTORS.DATE);

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

    if (dashboardClock) {
        dashboardClock.textContent = timeText;
    }

    if (dashboardDate) {
        dashboardDate.textContent = dateText;
    }
}

/* ==========================================================
   CURRENT USER
========================================================== */

function getCurrentDashboardUser() {
    const savedUserJson = localStorage.getItem(
        DASHBOARD_CONFIG.STORAGE_KEYS.CURRENT_USER
    );

    if (!savedUserJson) {
        return null;
    }

    try {
        return JSON.parse(savedUserJson);
    } catch (error) {
        console.warn("Invalid dlsCurrentUser:", error);
        return null;
    }
}

function renderDashboardUser() {
    const user = getCurrentDashboardUser();

    if (!user) {
        window.location.href = DASHBOARD_CONFIG.ROUTES.LOGIN;
        return;
    }

    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    const role = user.role || "lecturer";

    const nameElement = document.querySelector(DASHBOARD_CONFIG.SELECTORS.USER_NAME);
    const roleElement = document.querySelector(DASHBOARD_CONFIG.SELECTORS.USER_ROLE);

    if (nameElement) {
        nameElement.textContent = fullName || user.email || "מרצה";
    }

    if (roleElement) {
        roleElement.textContent = role;
    }
}

/* ==========================================================
   LOGOUT
========================================================== */

function disconnectRealtimeConnectionIfAvailable() {
    try {
        if (
            window.DLS_SOCKET &&
            typeof window.DLS_SOCKET.disconnect === "function"
        ) {
            window.DLS_SOCKET.disconnect();
        }
    } catch (error) {
        console.warn("Could not disconnect realtime socket:", error);
    }
}

function clearDashboardSession() {
    localStorage.removeItem(DASHBOARD_CONFIG.STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(DASHBOARD_CONFIG.STORAGE_KEYS.PENDING_EFFECT);

    /*
      We intentionally do NOT remove dlsRememberEmail.
      Remember-me should keep the email even after logout.
    */
}

function handleDashboardLogout(event) {
    event.preventDefault();

    disconnectRealtimeConnectionIfAvailable();
    clearDashboardSession();

    window.location.href = DASHBOARD_CONFIG.ROUTES.LOGIN;
}

function setupDashboardLogout() {
    const logoutButton = document.querySelector(
        DASHBOARD_CONFIG.SELECTORS.LOGOUT_BUTTON
    );

    if (!logoutButton) {
        return;
    }

    logoutButton.addEventListener("click", handleDashboardLogout);
}

/* ==========================================================
   INIT
========================================================== */

document.addEventListener("DOMContentLoaded", function () {
    updateDashboardClock();
    setInterval(updateDashboardClock, 1000);

    renderDashboardUser();
    setupDashboardLogout();
});