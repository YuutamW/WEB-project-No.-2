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
    API: {
        BASE_URL: "https://dls-backend-uelx.onrender.com",
        USERS_PATH: "/api/users",
        EDIT_USER_PATH: "/api/users/edit"
    },

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

/* ==========================================================
   EDIT CURRENT USER
   ----------------------------------------------------------
   Sends updated user fields to backend and syncs localStorage.

   Backend route expected:
   PUT /api/users/edit

   Body example:
   {
       _id: "mongo_user_id",
       firstName: "Dor"
   }
========================================================== */
async function editCurrentUser(updatedFields) {
    const currentUser = getCurrentDashboardUser();

    if (!currentUser) {
        throw new Error("No logged-in user found.");
    }

    const userId = currentUser.id || currentUser._id;

    if (!userId) {
        throw new Error("Missing user id.");
    }

    const response = await fetch(
        DASHBOARD_CONFIG.API.BASE_URL + DASHBOARD_CONFIG.API.EDIT_USER_PATH,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                _id: userId,
                ...updatedFields
            })
        }
    );

    const result = await response.json().catch(function () {
        return {};
    });

    if (!response.ok) {
        throw new Error(result.message || "User update failed.");
    }

    const updatedUser = result.data || result.user || updatedFields;

    const mergedUser = {
        ...currentUser,
        ...updatedUser,
        id: updatedUser.id || updatedUser._id || currentUser.id || currentUser._id,
        _id: updatedUser._id || updatedUser.id || currentUser._id || currentUser.id
    };

    localStorage.setItem(
        DASHBOARD_CONFIG.STORAGE_KEYS.CURRENT_USER,
        JSON.stringify(mergedUser, null, 2)
    );

    renderDashboardUser();

    return mergedUser;
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

    overlay.classList.remove("is-open");

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
   RECENT SESSIONS
========================================================== */
async function renderRecentSessions() {
    const container = document.querySelector("#dashboardRecentSessionsPanel");
    if(!container) return;

    try {
        const sessions = await DLS_API.getRecentSessions(5);
        if(!sessions || sessions.length === 0) {
            container.innerHTML = '<p class="dashboard-empty-state">אין סשנים קודמים להצגה.</p>';
            return;
        }

        container.innerHTML ="";

        sessions.forEach(session => {
            const sessionDate = new Date(session.date).toLocaleDateString("he-IL", {
                day: "2-digit", 
                month: "2-digit", 
                year: "numeric", 
                hour: "2-digit", 
                minute: "2-digit"
            });

            const card = document.createElement("a");
            // Placeholder link - update when session view is ready
            card.href = `session.html?code=${encodeURIComponent(session.id)}`; 
            card.className = "session-card";

            card.innerHTML = `
                <div class="session-card__info">
                    <h4 class="session-card__title"></h4>
                    <span class="session-card__date">${sessionDate}</span>
                </div>
                <div class="session-card__action">▶</div>
            `;
            card.querySelector('.session-card__title').textContent = session.title || `סשן (${session.id})`;
            container.appendChild(card);
        });
    } catch(error) { 
        console.error("Failed to Load recent Sessions:" ,error);
        container.innerHTML = '<p class="dashboard-empty-state" style="color: #ff637d;">שגיאה בטעינת סשנים.</p>';
    }
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
    renderRecentSessions();
});

window.dlsDashboardDebug = {
    getCurrentDashboardUser,
    editCurrentUser
};

