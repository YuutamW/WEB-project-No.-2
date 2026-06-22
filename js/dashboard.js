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
        LOGOUT_BUTTON: "[data-auth-action='logout']",

        SETTINGS_OPEN_BUTTON: "[data-dashboard-action='open-settings']",
        SETTINGS_CLOSE_BUTTONS: "[data-dashboard-action='close-settings']",
        SETTINGS_OVERLAY: "#settingsOverlay",
        SETTINGS_USER_ID: "#settingsUserId",
        SETTINGS_USER_EMAIL: "#settingsUserEmail"
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
   SETTINGS OVERLAY
   ----------------------------------------------------------
   Opens the user settings modal and injects current user data.
========================================================== */

/* OPEN SETTINGS OVERLAY - how it works:  
press settings ->
 id elem with js:[data-dashboard-action="open-settings"] ->
    run openSSettingsOverlay()->
        read dlsCurrentUser from localstorage. ->
            insert userId into #settingsUserId ->
                insert userEmail into #settingsUserEmail ->
                    Display #settingsOverlay;

*/
function openSettingsOverlay(event) {
    event.preventDefault();

    const user = getCurrentDashboardUser();
    const overlay = document.querySelector(DASHBOARD_CONFIG.SELECTORS.SETTINGS_OVERLAY);
    const userIdElement = document.querySelector(DASHBOARD_CONFIG.SELECTORS.SETTINGS_USER_ID);
    const userEmailElement = document.querySelector(DASHBOARD_CONFIG.SELECTORS.SETTINGS_USER_EMAIL);

    if (!overlay) {
        return;
    }

    if (userIdElement) {
        userIdElement.textContent = user?.id || user?._id || "לא נמצא";
    }

    if (userEmailElement) {
        userEmailElement.textContent = user?.email || "לא נמצא";
    }

    overlay.hidden = false;

    requestAnimationFrame(function () {
        overlay.classList.add("is-open");
    });
}

function closeSettingsOverlay() {
    const overlay = document.querySelector(DASHBOARD_CONFIG.SELECTORS.SETTINGS_OVERLAY);

    if (!overlay) {
        return;
    }

    overlay.hidden = false;

    setTimeout(function () {
        overlay.hidden = true;
    }, 220);
}

function setupSettingsOverlay() {
    const openButton = document.querySelector(
        DASHBOARD_CONFIG.SELECTORS.SETTINGS_OPEN_BUTTON
    );

    const closeButtons = document.querySelectorAll(
        DASHBOARD_CONFIG.SELECTORS.SETTINGS_CLOSE_BUTTONS
    );

    if (openButton) {
        openButton.addEventListener("click", openSettingsOverlay);
    }

    closeButtons.forEach(function (button) {
        button.addEventListener("click", closeSettingsOverlay);
    });

        document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closeSettingsOverlay();
        }
    });
}

/* ==========================================================
   INIT
========================================================== */

document.addEventListener("DOMContentLoaded", function () {
    updateDashboardClock();
    setInterval(updateDashboardClock, 1000);

    renderDashboardUser();
    setupDashboardLogout();
    setupSettingsOverlay();
});

