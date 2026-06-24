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

/* ==========================================================
   SETTINGS FEEDBACK
========================================================== */

function showSettingsFeedback(type, text) {
    const feedback = document.querySelector("#settingsFeedback");

    if (!feedback) {
        return;
    }

    feedback.hidden = false;
    feedback.className = `dashboard-modal__feedback ${type}`;
    feedback.textContent = text;
}

function clearSettingsFeedback() {
    const feedback = document.querySelector("#settingsFeedback");

    if (!feedback) {
        return;
    }

    feedback.hidden = true;
    feedback.textContent = "";
}


/* ==========================================================
   EDIT USER FORM
========================================================== */

function fillEditUserForm(user) {
    const firstNameInput = document.querySelector("#settingsEditFirstName");
    const lastNameInput = document.querySelector("#settingsEditLastName");
    const emailInput = document.querySelector("#settingsEditEmail");

    if (firstNameInput) {
        firstNameInput.value = user.firstName || "";
    }

    if (lastNameInput) {
        lastNameInput.value = user.lastName || "";
    }

    if (emailInput) {
        emailInput.value = user.email || "";
    }
}

function handleEditUserClick() {
    const currentUser = getCurrentDashboardUser();

    if (!currentUser) {
        showSettingsFeedback("error", "לא נמצא משתמש מחובר.");
        return;
    }

    const editForm = document.querySelector("#settingsEditForm");
    const deleteBox = document.querySelector("#deleteUserConfirmBox");

    clearSettingsFeedback();
    fillEditUserForm(currentUser);

    if (deleteBox) {
        deleteBox.hidden = true;
    }

    if (editForm) {
        editForm.hidden = false;
    }
}

function handleCancelEditUserClick() {
    /* Added this for pressing cancel to initiate popup of Assurence */
    if (isEditFormDirty()) {
        showAbortSettingsConfirmBox("edit");
        return;
    }

    const editForm = document.querySelector("#settingsEditForm");

    if (editForm) {
        editForm.hidden = true;
    }

    clearSettingsFeedback();
}

/* Password Checker */
function isStrongPassword(password) {
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    return hasUppercase && hasLowercase && hasNumber;
}

async function handleEditUserSubmit(event) {
    event.preventDefault();

    const firstNameInput = document.querySelector("#settingsEditFirstName");
    const lastNameInput = document.querySelector("#settingsEditLastName");
    const emailInput = document.querySelector("#settingsEditEmail");

    const passwordInput = document.querySelector("#settingsEditPassword");
    const confirmPasswordInput = document.querySelector("#settingsEditConfirmPassword");

    const password = passwordInput ? passwordInput.value : "";
    const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : "";

    const updatedFields = {
        firstName: firstNameInput ? firstNameInput.value.trim() : "",
        lastName: lastNameInput ? lastNameInput.value.trim() : "",
        email: emailInput ? emailInput.value.trim() : "",
        password: passwordInput ? passwordInput.value : ""
    };

    /* Check Password Valid */
    if (password || confirmPassword) {
        if (password !== confirmPassword) {
            showSettingsFeedback("error", "הסיסמאות אינן תואמות.");
            return;
        }

        if (!isStrongPassword(password)) {
            showSettingsFeedback(
                "error",
                "הסיסמה חייבת לכלול אות גדולה, אות קטנה ומספר."
            );
            return;
        }

        updatedFields.password = password;
    }

    try {
        const updatedUser = await editCurrentUser(updatedFields);

        const editForm = document.querySelector("#settingsEditForm");

        if (editForm) {
            editForm.hidden = true;
        }

        const userIdElement = document.querySelector(DASHBOARD_CONFIG.SELECTORS.SETTINGS_USER_ID);
        const userEmailElement = document.querySelector(DASHBOARD_CONFIG.SELECTORS.SETTINGS_USER_EMAIL);

        if (userIdElement) {
            userIdElement.textContent = updatedUser.id || updatedUser._id || "לא נמצא";
        }

        if (userEmailElement) {
            userEmailElement.textContent = updatedUser.email || "לא נמצא";
        }

        if (password || confirmPassword) {
            if (password !== confirmPassword) {
                showSettingsFeedback("error", "הסיסמאות אינן תואמות.");
                return;
            }

            updatedFields.password = password;
        }

        /* Empty Input Text of Password */
        if (passwordInput) {
            passwordInput.value = "";
        }

        if (confirmPasswordInput) {
            confirmPasswordInput.value = "";
        }

        showSettingsFeedback("success", "המשתמש עודכן בהצלחה.");
    } catch (error) {
        showSettingsFeedback("error", error.message || "עדכון משתמש נכשל.");
    }
}


/* ==========================================================
   DELETE USER FLOW
========================================================== */

function handleDeleteUserClick() {
    const editForm = document.querySelector("#settingsEditForm");
    const deleteBox = document.querySelector("#deleteUserConfirmBox");

    clearSettingsFeedback();

    if (editForm) {
        editForm.hidden = true;
    }

    if (deleteBox) {
        deleteBox.hidden = false;
    }
}

function handleCancelDeleteUserClick() {
    const deleteBox = document.querySelector("#deleteUserConfirmBox");

    if (deleteBox) {
        deleteBox.hidden = true;
    }

    clearSettingsFeedback();
}

async function deleteCurrentUser() {
    const currentUser = getCurrentDashboardUser();

    if (!currentUser) {
        throw new Error("No logged-in user found.");
    }

    const userId = currentUser.id || currentUser._id;

    if (!userId) {
        throw new Error("Missing user id.");
    }

    const response = await fetch(
        DASHBOARD_CONFIG.API.BASE_URL +
        DASHBOARD_CONFIG.API.USERS_PATH +
        "/" +
        encodeURIComponent(userId),
        {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            }
        }
    );

    const result = await response.json().catch(function () {
        return {};
    });

    if (!response.ok) {
        throw new Error(result.message || "Delete user failed.");
    }

    clearDashboardSession();

    window.location.href = DASHBOARD_CONFIG.ROUTES.LOGIN;

    return result;
}

async function handleConfirmDeleteUserClick() {
    try {
        await deleteCurrentUser();
    } catch (error) {
        showSettingsFeedback("error", error.message || "מחיקת משתמש נכשלה.");
    }
}


/* ==========================================================
   SETUP SETTINGS USER BUTTONS
========================================================== */

function setupSettingsActions() {
    const editButton = document.querySelector("[data-dashboard-action='edit-user']");
    const deleteButton = document.querySelector("[data-dashboard-action='delete-user']");
    const cancelEditButton = document.querySelector("[data-dashboard-action='cancel-edit-user']");
    const cancelDeleteButton = document.querySelector("[data-dashboard-action='cancel-delete-user']");
    const confirmDeleteButton = document.querySelector("[data-dashboard-action='confirm-delete-user']");
    const editForm = document.querySelector("#settingsEditForm");

    const confirmAbortButton = document.querySelector("[data-dashboard-action='confirm-abort-settings']");
    const cancelAbortButton = document.querySelector("[data-dashboard-action='cancel-abort-settings']");

    if (confirmAbortButton) {
        confirmAbortButton.addEventListener("click", handleConfirmAbortSettingsClick);
    }

    if (cancelAbortButton) {
        cancelAbortButton.addEventListener("click", handleCancelAbortSettingsClick);
    }

    if (editButton) {
        editButton.addEventListener("click", handleEditUserClick);
    }

    if (deleteButton) {
        deleteButton.addEventListener("click", handleDeleteUserClick);
    }

    if (cancelEditButton) {
        cancelEditButton.addEventListener("click", handleCancelEditUserClick);
    }

    if (cancelDeleteButton) {
        cancelDeleteButton.addEventListener("click", handleCancelDeleteUserClick);
    }

    if (confirmDeleteButton) {
        confirmDeleteButton.addEventListener("click", handleConfirmDeleteUserClick);
    }

    if (editForm) {
        editForm.addEventListener("submit", handleEditUserSubmit);
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
    const logoutButtons = document.querySelectorAll(
        DASHBOARD_CONFIG.SELECTORS.LOGOUT_BUTTON
    );

    // for single querry: logoutButton.addEventListener("click", handleDashboardLogout);
    logoutButtons.forEach(function (button) {
        button.addEventListener("click", handleDashboardLogout);
    });
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

    if (event) {
        event.preventDefault();
    }

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

// added Abort / Apply action Popup Menu :
function isSettingsActionActive() {
    const editForm = document.querySelector("#settingsEditForm");
    const deleteBox = document.querySelector("#deleteUserConfirmBox");

    return (
        (editForm && !editForm.hidden) ||
        (deleteBox && !deleteBox.hidden)
    );
}

function getEditFormValues() {
    const firstNameInput = document.querySelector("#settingsEditFirstName");
    const lastNameInput = document.querySelector("#settingsEditLastName");
    const emailInput = document.querySelector("#settingsEditEmail");

    return {
        firstName: firstNameInput ? firstNameInput.value.trim() : "",
        lastName: lastNameInput ? lastNameInput.value.trim() : "",
        email: emailInput ? emailInput.value.trim() : ""
    };
}

function isEditFormDirty() {
    const currentUser = getCurrentDashboardUser();
    const values = getEditFormValues();

    if (!currentUser) {
        return false;
    }

    return (
        values.firstName !== (currentUser.firstName || "") ||
        values.lastName !== (currentUser.lastName || "") ||
        values.email !== (currentUser.email || "")
    );
}

function getActiveSettingsAction() {
    const editForm = document.querySelector("#settingsEditForm");
    const deleteBox = document.querySelector("#deleteUserConfirmBox");

    if (editForm && !editForm.hidden) {
        return "edit";
    }

    if (deleteBox && !deleteBox.hidden) {
        return "delete";
    }

    return null;
}

function showAbortSettingsConfirmBox(actionType) {
    const abortBox = document.querySelector("#abortSettingsConfirmBox");
    const message = document.querySelector("#abortSettingsMessage");

    if (!abortBox) {
        return;
    }

    if (message) {
        if (actionType === "edit") {
            message.textContent = "יש שינויים שלא נשמרו. האם לבטל אותם ולסגור את ההגדרות?";
        } else if (actionType === "delete") {
            message.textContent = "מחיקת משתמש פתוחה. האם לבטל את הפעולה ולסגור את ההגדרות?";
        } else {
            message.textContent = "יש פעולה פתוחה. האם לבטל אותה ולסגור את ההגדרות?";
        }
    }

    abortBox.hidden = false;
}

function hideAbortSettingsConfirmBox() {
    const abortBox = document.querySelector("#abortSettingsConfirmBox");

    if (abortBox) {
        abortBox.hidden = true;
    }
}

function resetSettingsActionPanels() {
    const editForm = document.querySelector("#settingsEditForm");
    const deleteBox = document.querySelector("#deleteUserConfirmBox");

    if (editForm) {
        editForm.hidden = true;
    }

    if (deleteBox) {
        deleteBox.hidden = true;
    }

    hideAbortSettingsConfirmBox();
    clearSettingsFeedback();
}

function forceCloseSettingsOverlay() {
    const overlay = document.querySelector(DASHBOARD_CONFIG.SELECTORS.SETTINGS_OVERLAY);

    if (!overlay) {
        return;
    }

    overlay.classList.remove("is-open");

    setTimeout(function () {
        overlay.hidden = true;
        resetSettingsActionPanels();
    }, 220);
}

function requestCloseSettingsOverlay(event) {
    if (event) {
        event.preventDefault();
    }

    const activeAction = getActiveSettingsAction();

    if (activeAction === "edit") {
        if (isEditFormDirty()) {
            showAbortSettingsConfirmBox("edit");
            return;
        }

        forceCloseSettingsOverlay();
        return;
    }

    if (activeAction === "delete") {
        showAbortSettingsConfirmBox("delete");
        return;
    }

    forceCloseSettingsOverlay();
}

function handleConfirmAbortSettingsClick() {
    resetSettingsActionPanels();
    forceCloseSettingsOverlay();
}

function handleCancelAbortSettingsClick() {
    hideAbortSettingsConfirmBox();
}


function setupSettingsOverlay() {
    const openButtons = document.querySelectorAll(
        DASHBOARD_CONFIG.SELECTORS.SETTINGS_OPEN_BUTTON
    );

    const closeButtons = document.querySelectorAll(
        DASHBOARD_CONFIG.SELECTORS.SETTINGS_CLOSE_BUTTONS
    );

    openButtons.forEach(function (button) {
        button.addEventListener("click", openSettingsOverlay);
    });

    closeButtons.forEach(function (button) {
        button.addEventListener("click", requestCloseSettingsOverlay);
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            requestCloseSettingsOverlay(event);
        }
    });
}

function setupLecturerDashboardPolishActions() {
    const nextLessonsButtons = document.querySelectorAll(
        "[data-dashboard-action='open-next-lessons']"
    );

    const jumpSessionButtons = document.querySelectorAll(
        "[data-dashboard-action='open-jump-session']"
    );

    const closeOverlayButtons = document.querySelectorAll(
        "[data-dashboard-action='close-dashboard-overlay']"
    );

    nextLessonsButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            openDashboardOverlay("#nextLessonsOverlay");
        });
    });

    jumpSessionButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            openDashboardOverlay("#jumpSessionOverlay");
        });
    });

    closeOverlayButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            const overlay = button.closest(".dashboard-modal");
            closeDashboardOverlay(overlay);
        });
    });

    //setupDashboardOverlayBackdropClose(".dashboard-modal");
    // switched for local listener since we dont use Dashboard-core;
    document.addEventListener("click", function (event) {
        const clickedBackdrop = event.target.classList.contains(
            "dashboard-modal__backdrop"
        );

        if (!clickedBackdrop) {
            return;
        }

        const overlay = event.target.closest(".dashboard-modal");

        if (!overlay) {
            return;
        }

        overlay.classList.remove("is-open");

        setTimeout(function () {
            overlay.hidden = true;
        }, 220);
    });
}

// setup Mobile Menu:
function dashboardOpenMobileMenu(mobileNav, toggleButton) {
    mobileNav.hidden = false;
    toggleButton.classList.add("is-open");
    toggleButton.setAttribute("aria-expanded", "true");

    requestAnimationFrame(function () {
        mobileNav.classList.add("is-open");
    });
}

function dashboardCloseMobileMenu(mobileNav, toggleButton) {
    mobileNav.classList.remove("is-open");
    toggleButton.classList.remove("is-open");
    toggleButton.setAttribute("aria-expanded", "false");

    setTimeout(function () {
        if (!mobileNav.classList.contains("is-open")) {
            mobileNav.hidden = true;
        }
    }, 180);
}

function setupMobileMenu() {
    const toggleButton = document.querySelector("[data-dashboard-action='toggle-mobile-menu']");
    const mobileNav = document.querySelector("#dashboardMobileNav");

    if (!toggleButton || !mobileNav) {
        return;
    }

    toggleButton.addEventListener("click", function (event) {
        event.stopPropagation();

        if (mobileNav.hidden) {
            dashboardOpenMobileMenu(mobileNav, toggleButton);
        } else {
            dashboardCloseMobileMenu(mobileNav, toggleButton);
        }
    });

    mobileNav.addEventListener("click", function (event) {
        event.stopPropagation();

        const clickedItem =
            event.target.closest("a") ||
            event.target.closest("button");

        if (clickedItem) {
            dashboardCloseMobileMenu(mobileNav, toggleButton);
        }
    });

    document.addEventListener("click", function (event) {
        if (mobileNav.hidden) {
            return;
        }

        const clickedInsideMenu = mobileNav.contains(event.target);
        const clickedToggle = toggleButton.contains(event.target);

        if (!clickedInsideMenu && !clickedToggle) {
            dashboardCloseMobileMenu(mobileNav, toggleButton);
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !mobileNav.hidden) {
            dashboardCloseMobileMenu(mobileNav, toggleButton);
        }
    });
}

/* HELPER - Call Settings Via URL */
function openSettingsFromUrlIfNeeded() {
    const params = new URLSearchParams(window.location.search);

    const shouldOpenSettings =
        params.get("settings") === "1" ||
        window.location.hash === "#settings";

    if (!shouldOpenSettings) {
        return;
    }

    openSettingsOverlay({
        preventDefault: function () { }
    });
}

/* Treat Wierd Naming Helper in Sessions names */
function normalizeSessionTitle(session) {
    const rawTitle = String(session?.title || "").trim();

    const cleanedTitle = rawTitle
        .replace(/^\((.*)\)$/, "$1")
        .trim();

    const invalidTitles = [
        "",
        "undefined",
        "(undefined)",
        "null",
        "(null)",
        "Session:(undefined)"
    ];

    if (!invalidTitles.includes(cleanedTitle)) {
        return cleanedTitle;
    }

    const code = session?.code || session?.id || "";

    if (code) {
        return `סשן ${code}`;
    }

    return "סשן ללא שם";
}

function getSessionCode(session) {
    return session?.code || session?.id || "";
}

/* ==========================================================
   RECENT SESSIONS
   
   Backend needs : GET /api/sessions/recent?userId=...&limit=...
========================================================== */
async function renderRecentSessions() {
    const container = document.querySelector("#dashboardRecentSessionsPanel");
    if (!container) return;

    try {
        const sessions = await DLS_API.getRecentSessions(5);
        if (!sessions || sessions.length === 0) {
            container.innerHTML = '<p class="dashboard-empty-state">אין סשנים קודמים להצגה.</p>';
            return;
        }

        container.innerHTML = "";

        sessions.forEach(session => {
            const sessionDate = new Date(session.date).toLocaleDateString("he-IL", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
            const sessionCode = getSessionCode(session);
            const sessionTitle = normalizeSessionTitle(session);

            const card = document.createElement("a");
            // Placeholder link - update when session view is ready
            card.href = `session.html?code=${encodeURIComponent(session.code || session.id)}`;
            card.className = "session-card";

            card.innerHTML = `
                <div class="session-card__info">
                    <h4 class="session-card__title"></h4>
                    <span class="session-card__date">${sessionDate}</span>
                </div>
                <div class="session-card__action">▶</div>
            `;
            card.querySelector(".session-card__title").textContent = sessionTitle;
                // session.title || `הרצאה ${new Date().toLocaleDateString("he-IL")}`;
            container.appendChild(card);
        });
    } catch (error) {
        console.error("Failed to Load recent Sessions:", error);
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
    setupSettingsActions();
    setupMobileMenu();
    setupLecturerDashboardPolishActions();
    renderRecentSessions();

    //openSettingsFromUrlIfNeeded();// for debug purposes only
});

// DEBUG ONLY - enable when needed:!
// window.dlsDashboardDebug = {
//     getCurrentDashboardUser,
//     editCurrentUser,
//     deleteCurrentUser,
//     openSettingsOverlay,
//     requestCloseSettingsOverlay
// };

