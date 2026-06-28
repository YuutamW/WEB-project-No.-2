/*
Shared Points :

sidebar
mobile menu
header / greeting
clock
logout
settings overlay
calendar panel
modal logic
glass tiles
QR overlay style
current user loading

---

shared funcs:

getCurrentDashboardUser()
renderDashboardShell(user)
updateDashboardClock()
setupMobileMenu()
openDashboardOverlay(id)
closeDashboardOverlay(id)
setupLogout()
setupSettingsOverlay()
---
seperate role renderers :
dashboard-lecturer.js
dashboard-student.js

---
*/

/* 
   DLS DASHBOARD CORE
   ----------------------------------------------------------
   Shared mechanics for Lecturer + Student dashboards.
   This file does NOT decide the role layout [yet].
 */
const DLS_DASHBOARD_CORE = {
    STORAGE_KEYS: {
        CURRENT_USER: "dlsCurrentUser",
        CURRENT_SESSION: "dlsCurrentSession",
        PENDING_EFFECT: "dlsPendingEffect"
    },

    ROUTES: {
        LOGIN: "login.html"
    },

    SELECTORS: {
        CLOCK: "#dashboardClock",
        DATE: "#dashboardDate",
        USER_NAME: "#dashboardUserName, #studentName",
        USER_ROLE: "#dashboardUserRole, #studentRole",
        USER_EMAIL: "#studentEmail",

        LOGOUT_BUTTON: "[data-auth-action='logout']",

        MOBILE_MENU_BUTTON: "[data-dashboard-action='toggle-mobile-menu']",
        MOBILE_NAV: "#dashboardMobileNav"
    }
};

/* ---------- DOM helpers ---------- */

function dashboardGetElement(selector) {
    return document.querySelector(selector);
}

function dashboardGetElements(selector) {
    return document.querySelectorAll(selector);
}

function dashboardSetText(selector, value) {
    const element = dashboardGetElement(selector);

    if (!element) {
        return;
    }

    element.textContent = value;
}

/* ---------- current user ---------- */

function getCurrentDashboardUser() {
    const savedUserJson = localStorage.getItem(
        DLS_DASHBOARD_CORE.STORAGE_KEYS.CURRENT_USER
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

function requireDashboardUser() {
    const user = getCurrentDashboardUser();

    if (!user) {
        window.location.href = DLS_DASHBOARD_CORE.ROUTES.LOGIN;
        return null;
    }

    return user;
}

function getDashboardUserFullName(user) {
    return `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
}

function renderDashboardUserBasic(options = {}) {
    const user = requireDashboardUser();

    if (!user) {
        return null;
    }

    const fullName = getDashboardUserFullName(user);
    const fallbackName = options.fallbackName || user.email || "משתמש";

    dashboardSetText(
        options.nameSelector || DLS_DASHBOARD_CORE.SELECTORS.USER_NAME,
        fullName || fallbackName
    );

    dashboardSetText(
        options.roleSelector || DLS_DASHBOARD_CORE.SELECTORS.USER_ROLE,
        user.role || options.fallbackRole || "student"
    );

    if (options.emailSelector) {
        dashboardSetText(options.emailSelector, user.email || "No email");
    }

    return user;
}

/* ---------- clock ---------- */

function updateDashboardClock() {
    const now = new Date();

    dashboardSetText(
        DLS_DASHBOARD_CORE.SELECTORS.CLOCK,
        now.toLocaleTimeString("he-IL", {
            hour: "2-digit",
            minute: "2-digit"
        })
    );

    dashboardSetText(
        DLS_DASHBOARD_CORE.SELECTORS.DATE,
        now.toLocaleDateString("he-IL", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        })
    );
}

function startDashboardClock() {
    updateDashboardClock();

    /* Added Guard here: */
    if (dashboardClockIntervalId) {
        return;
    }

    setInterval(updateDashboardClock, 1000);
}

/* ---------- logout ---------- */

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

function clearDashboardSession(options = {}) {
    localStorage.removeItem(DLS_DASHBOARD_CORE.STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(DLS_DASHBOARD_CORE.STORAGE_KEYS.CURRENT_SESSION);
    localStorage.removeItem(DLS_DASHBOARD_CORE.STORAGE_KEYS.PENDING_EFFECT);

    if (options.clearRememberEmail) {
        localStorage.removeItem("dlsRememberEmail");
    }
}

function handleDashboardLogout(event) {
    if (event) {
        event.preventDefault();
    }

    disconnectRealtimeConnectionIfAvailable();
    clearDashboardSession();

    window.location.href = DLS_DASHBOARD_CORE.ROUTES.LOGIN;
}

function setupDashboardLogout() {
    const logoutButtons = dashboardGetElements(
        DLS_DASHBOARD_CORE.SELECTORS.LOGOUT_BUTTON
    );

    logoutButtons.forEach(function (button) {
        button.addEventListener("click", handleDashboardLogout);
    });
}

/* ---------- generic overlays ---------- */

function openDashboardOverlay(selectorOrElement) {
    const overlay =
        typeof selectorOrElement === "string"
            ? dashboardGetElement(selectorOrElement)
            : selectorOrElement;

    if (!overlay) {
        return;
    }

    overlay.hidden = false;

    requestAnimationFrame(function () {
        overlay.classList.add("is-open");
    });
}

function closeDashboardOverlay(selectorOrElement, options = {}) {
    const overlay =
        typeof selectorOrElement === "string"
            ? dashboardGetElement(selectorOrElement)
            : selectorOrElement;

    if (!overlay) {
        return;
    }

    if (typeof options.beforeClose === "function") {
        options.beforeClose();
    }

    overlay.classList.remove("is-open");

    setTimeout(function () {
        overlay.hidden = true;
    }, options.duration || 220);
}

function setupDashboardOverlayBackdropClose(rootSelector, closeOptions = {}) {
    document.addEventListener("click", function (event) {
        const clickedBackdrop = event.target.classList.contains(
            "dashboard-modal__backdrop"
        );

        if (!clickedBackdrop) {
            return;
        }

        const overlay = event.target.closest(rootSelector || ".dashboard-modal");

        closeDashboardOverlay(overlay, closeOptions);
    });
}

/* ---------- mobile menu ---------- */

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
    }, 220);
}

function setupDashboardMobileMenu() {
    const toggleButton = dashboardGetElement(
        DLS_DASHBOARD_CORE.SELECTORS.MOBILE_MENU_BUTTON
    );

    const mobileNav = dashboardGetElement(
        DLS_DASHBOARD_CORE.SELECTORS.MOBILE_NAV
    );

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

/* ---------- shared init ---------- */
/* Guard for calling more than once to listeners - to prevent connection */
let dashboardCoreInitialized = false;
let dashboardClockIntervalId = null;

function setupDashboardCore() {
    
    /* Added Guard: */
    if (dashboardCoreInitialized) {
        return;
    }

    dashboardCoreInitialized = true;
    // ---

    startDashboardClock();
    setupDashboardLogout();
    setupDashboardMobileMenu();
}

// DEBUG EXPORT for console:
// ex. : typeof DLS_DASHBOARD_CORE_API.setupDashboardCore
window.DLS_DASHBOARD_CORE_API = {
    setupDashboardCore,
    getCurrentDashboardUser,
    requireDashboardUser,
    getDashboardUserFullName,
    renderDashboardUserBasic,
    dashboardGetElement,
    dashboardGetElements,
    dashboardSetText,
    openDashboardOverlay,
    closeDashboardOverlay,
    setupDashboardOverlayBackdropClose,
    setupDashboardLogout,
    setupDashboardMobileMenu,
    clearDashboardSession
};