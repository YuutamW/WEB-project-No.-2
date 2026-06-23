/* 
   STUDENT DASHBOARD MANAGER
   ---------------------------------------------------------
   Load the logged-in student and show only this student's
   questions from the backend.
   
   Important:
   It only shows personal student data.
 */

/*
PIPELINE: (CURRENTLY):
----------------------
getCurrentDlsUser()
 ↓
loads user from localStorage, but only through one helper

DLS_API.getMyQuestions()
 ↓
adds studentId/studentEmail automatically

renderStudentQuestions()
 ↓
shows only personal question cards
*/


/* 
   Page Constants
   Keep all selectors and page-specific values in one place.
 */
const STUDENT_DASHBOARD_CONFIG = {
    PRESENTATION_ID: DLS_CONFIG.DEFAULTS.PRESENTATION_ID,

    STORAGE_KEYS: {
        CURRENT_SESSION: DLS_CONFIG.STORAGE_KEYS.CURRENT_SESSION || "dlsCurrentSession"
    },

    ROUTES: {
        LOGIN: "login.html",
        PRESENTATION: "presentetion.html"
    },

    SELECTORS: {
        studentName: "#studentName",
        studentEmail: "#studentEmail",
        studentRole: "#studentRole",

        clock: "#dashboardClock",
        date: "#dashboardDate",

        questionsList: "#studentQuestionsList",
        emptyState: "#studentQuestionsEmpty",
        errorMessage: "#studentDashboardError",

        joinOverlay: "#studentJoinOverlay",
        studyOverlay: "#studentStudyOverlay",
        joinSessionForm: "#studentJoinSessionForm",
        sessionCodeInput: "#studentSessionCodeInput",
        joinFeedback: "#studentJoinSessionFeedback",

        mobileMenuButton: "[data-dashboard-action='toggle-mobile-menu']",
        mobileNav: "#dashboardMobileNav",
        logoutButton: "[data-auth-action='logout']",

        activeSessionCard: "#studentActiveSessionCard",
        activeSessionText: "#studentActiveSessionText",
        continueSessionLink: "#studentContinueSessionLink",

        qrScannerBox: "#studentQrScannerBox",
        qrReader: "#studentQrReader",
        scanQrButton: "[data-student-action='scan-qr']",
        stopQrButton: "[data-student-action='stop-qr']",

        settingsOverlay: "#studentSettingsOverlay",
    }
};


/* 
   Small DOM Helper
   Avoid repeating document.querySelector everywhere.
 */
function getElement(selector) {
    return document.querySelector(selector);
}


function setText(selector, value) {
    const element = getElement(selector);

    if (!element) {
        return;
    }

    element.textContent = value;
}

/* 
   CLOCK + DATE
 */
function updateStudentClock() {
    const now = new Date();

    setText(
        STUDENT_DASHBOARD_CONFIG.SELECTORS.clock,
        now.toLocaleTimeString("he-IL", {
            hour: "2-digit",
            minute: "2-digit"
        })
    );

    setText(
        STUDENT_DASHBOARD_CONFIG.SELECTORS.date,
        now.toLocaleDateString("he-IL", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        })
    );
}


/* 
   Render Current Student
   Show the logged-in student's basic info.
 */
function renderStudentInfo(user) {
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();

    setText(
        STUDENT_DASHBOARD_CONFIG.SELECTORS.studentName,
        fullName || "Student"
    );

    setText(
        STUDENT_DASHBOARD_CONFIG.SELECTORS.studentEmail,
        user.email || "No email"
    );

    setText(
        STUDENT_DASHBOARD_CONFIG.SELECTORS.studentRole,
        user.role || "student"
    );
}

/* 
   STUDENT OVERLAYS
 */

function openStudentOverlay(selector) {
    const overlay = getElement(selector);

    if (!overlay) {
        return;
    }

    overlay.hidden = false;

    requestAnimationFrame(function () {
        overlay.classList.add("is-open");
    });
}

function closeStudentOverlay(overlay) {
    if (!overlay) {
        return;
    }

    // stops QR scanning (while[cameraStream])
    if (typeof stopStudentQrScanner === "function") {
        stopStudentQrScanner();
    }

    overlay.classList.remove("is-open");

    setTimeout(function () {
        overlay.hidden = true;
    }, 220);
}

function closeAllStudentOverlays() {
    const overlays = document.querySelectorAll(
        ".dashboard-page--student .dashboard-modal"
    );

    overlays.forEach(function (overlay) {
        closeStudentOverlay(overlay);
    });
}

function setupStudentOverlays() {
    const joinButtons = document.querySelectorAll(
        "[data-student-action='open-join-session']"
    );

    const notesButtons = document.querySelectorAll(
        "[data-student-action='open-notes-demo']"
    );

    const questionsButtons = document.querySelectorAll(
        "[data-student-action='open-questions-demo']"
    );

    const closeButtons = document.querySelectorAll(
        "[data-student-action='close-overlay']"
    );

    joinButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            openStudentOverlay(STUDENT_DASHBOARD_CONFIG.SELECTORS.joinOverlay);
        });
    });

    notesButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            setText("#studentStudyOverlayTitle", "ההערות שלי");
            openStudentOverlay(STUDENT_DASHBOARD_CONFIG.SELECTORS.studyOverlay);
        });
    });

    questionsButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            setText("#studentStudyOverlayTitle", "השאלות שלי");
            openStudentOverlay(STUDENT_DASHBOARD_CONFIG.SELECTORS.studyOverlay);
        });
    });

    closeButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            const overlay = button.closest(".dashboard-modal");
            closeStudentOverlay(overlay);
        });
    });

    document.addEventListener("click", function (event) {
        const clickedBackdrop = event.target.classList.contains("dashboard-modal__backdrop");

        if (!clickedBackdrop) {
            return;
        }

        const overlay = event.target.closest(".dashboard-modal");

        closeStudentOverlay(overlay);
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closeAllStudentOverlays();
        }
    });

    const settingsButtons = document.querySelectorAll(
        "[data-dashboard-action='open-settings']"
    );

    settingsButtons.forEach(function (button) {
        button.addEventListener("click", function (event) {
            event.preventDefault();
            openStudentOverlay(STUDENT_DASHBOARD_CONFIG.SELECTORS.settingsOverlay);
        });
    });
}



/* 
   Create Question Card
   Convert one question object into one dashboard card.
 */
function createQuestionCard(question) {
    const item = document.createElement("article");

    item.className = "student-question-card";

    item.innerHTML = `
        <div class="student-question-card__top">
            <span class="student-question-page">
                Page ${question.page ?? "-"}
            </span>

            <span class="student-question-status ${question.status || "open"}">
                ${question.status || "open"}
            </span>
        </div>

        <p class="student-question-text">
            ${question.text || ""}
        </p>

        <div class="student-question-meta">
            <span>
                ${formatQuestionDate(question.createdAt)}
            </span>
        </div>
    `;

    return item;
}


/* 
   Date Formatter
   Convert server ISO date into readable local date.
 */
function formatQuestionDate(dateValue) {
    if (!dateValue) {
        return "";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleString("he-IL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}


/* 
   Render Questions List
   Show only questions that belong to current student.
 */
function renderStudentQuestions(questions) {
    const list = getElement(
        STUDENT_DASHBOARD_CONFIG.SELECTORS.questionsList
    );

    const emptyState = getElement(
        STUDENT_DASHBOARD_CONFIG.SELECTORS.emptyState
    );

    if (!list) {
        return;
    }

    list.innerHTML = "";

    if (!questions || questions.length === 0) {
        if (emptyState) {
            emptyState.hidden = false;
        }

        return;
    }

    if (emptyState) {
        emptyState.hidden = true;
    }

    questions
        .slice()
        .sort(function (a, b) {
            return new Date(b.createdAt) - new Date(a.createdAt);
        })
        .forEach(function (question) {
            const card = createQuestionCard(question);
            list.appendChild(card);
        });
}

function getCurrentStudentSession() {
    const sessionJson = localStorage.getItem(
        STUDENT_DASHBOARD_CONFIG.STORAGE_KEYS.CURRENT_SESSION
    );

    if (!sessionJson) {
        return null;
    }

    try {
        return JSON.parse(sessionJson);
    } catch (error) {
        console.warn("Invalid current session in localStorage:", error);
        return null;
    }
}

function renderActiveSession() {
    const session = getCurrentStudentSession();

    const card = getElement(
        STUDENT_DASHBOARD_CONFIG.SELECTORS.activeSessionCard
    );

    const text = getElement(
        STUDENT_DASHBOARD_CONFIG.SELECTORS.activeSessionText
    );

    const link = getElement(
        STUDENT_DASHBOARD_CONFIG.SELECTORS.continueSessionLink
    );

    if (!card || !text || !link) {
        return;
    }

    if (!session) {
        card.classList.add("is-disabled");
        text.textContent = "אין סשן פעיל כרגע.";
        link.hidden = true;
        return;
    }

    const code = session.code || session.sessionCode || session.joinCode || "לא ידוע";

    card.classList.remove("is-disabled");
    text.textContent = `אתה מחובר לסשן: ${code}`;

    link.href =
        STUDENT_DASHBOARD_CONFIG.ROUTES.PRESENTATION +
        "?sessionCode=" +
        encodeURIComponent(code);

    link.hidden = false;
}


/* 
   Load Dashboard Data

   Main page loading flow:
   1. read current user
   2. render student info
   3. call backend for my questions only
   4. render the questions
 */
async function loadStudentDashboard() {
    const currentUser = getCurrentDlsUser();

    if (!currentUser) {
        window.location.href = "login.html";
        return;
    }

    renderStudentInfo(currentUser);

    try {
        const questions = await DLS_API.getMyQuestions({
            presentationId: STUDENT_DASHBOARD_CONFIG.PRESENTATION_ID
        });

        renderStudentQuestions(questions);
    } catch (error) {
        console.error("Failed to load student dashboard:", error);

        setText(
            STUDENT_DASHBOARD_CONFIG.SELECTORS.errorMessage,
            error.message || "Failed to load your questions."
        );
    }
}


/* 
   Actions
   Connect buttons to page navigation.
 */
// function setupStudentDashboardActions() {
//     const joinButton = getElement(
//         STUDENT_DASHBOARD_CONFIG.SELECTORS.joinLectureButton
//     );

//     if (!joinButton) {
//         return;
//     }

//     joinButton.addEventListener("click", function () {
//         window.location.href = "presentetion.html";
//     });
// }

/* 
   JOIN SESSION FLOW
   -----------------
 */

/* Join  - Overlay */
// not working with hash = #joincode
// function getJoinCodeFromUrl() {
//     const params = new URLSearchParams(window.location.search);
//     return params.get("joinCode") || params.get("code") || "";
// }

function getJoinCodeFromUrl() {
    const queryParams = new URLSearchParams(window.location.search);

    const queryCode =
        queryParams.get("joinCode") ||
        queryParams.get("code") ||
        "";

    if (queryCode) {
        return queryCode;
    }

    const hashText = window.location.hash.replace("#", "");

    if (!hashText) {
        return "";
    }

    const hashParams = new URLSearchParams(hashText);

    return (
        hashParams.get("joinCode") ||
        hashParams.get("code") ||
        ""
    );
}

function prefillJoinCodeFromUrl() {
    const input = getElement(
        STUDENT_DASHBOARD_CONFIG.SELECTORS.sessionCodeInput
    );

    const code = getJoinCodeFromUrl();
    const hash = window.location.hash;

    if (input && code) {
        input.value = code;
        openStudentOverlay(STUDENT_DASHBOARD_CONFIG.SELECTORS.joinOverlay);
    }

    if (hash === "#studentJoinSession") {
        openStudentOverlay(STUDENT_DASHBOARD_CONFIG.SELECTORS.joinOverlay);
    }

    if (hash === "#studentQuestionsPanel") {
        setText("#studentStudyOverlayTitle", "השאלות שלי");
        openStudentOverlay(STUDENT_DASHBOARD_CONFIG.SELECTORS.studyOverlay);
    }
}

function showJoinFeedback(type, text) {
    const feedback = getElement(
        STUDENT_DASHBOARD_CONFIG.SELECTORS.joinFeedback
    );

    if (!feedback) {
        return;
    }

    feedback.hidden = false;
    feedback.className = `dashboard-modal__feedback ${type}`;
    feedback.textContent = text;
}

async function joinSessionByCode(code) {
    const currentUser = getCurrentDlsUser();

    if (!currentUser) {
        window.location.href = STUDENT_DASHBOARD_CONFIG.ROUTES.LOGIN;
        return;
    }

    const cleanCode = String(code || "").trim();

    if (!cleanCode) {
        throw new Error("יש להזין קוד סשן.");
    }

    const userId = currentUser.id || currentUser._id;

    if (!userId) {
        throw new Error("לא נמצא userId למשתמש המחובר.");
    }

    const sessionData = await DLS_API.joinSession(cleanCode, {
        userId: userId
    });

    const sessionToSave = {
        ...sessionData,
        code: cleanCode,
        joinedAt: new Date().toISOString()
    };

    localStorage.setItem(
        STUDENT_DASHBOARD_CONFIG.STORAGE_KEYS.CURRENT_SESSION,
        JSON.stringify(sessionToSave, null, 2)
    );

    window.location.href =
        STUDENT_DASHBOARD_CONFIG.ROUTES.PRESENTATION +
        "?sessionCode=" +
        encodeURIComponent(cleanCode);
}

function setupJoinSessionForm() {
    const form = getElement(
        STUDENT_DASHBOARD_CONFIG.SELECTORS.joinSessionForm
    );

    const input = getElement(
        STUDENT_DASHBOARD_CONFIG.SELECTORS.sessionCodeInput
    );

    if (!form || !input) {
        return;
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        try {
            showJoinFeedback("success", "מתחבר לסשן...");
            await joinSessionByCode(input.value);
        } catch (error) {
            showJoinFeedback(
                "error",
                error.message || "הצטרפות לסשן נכשלה."
            );
        }
    });
}

/* 
- TEST : http://127.0.0.1:5502/student-dashboard.html?joinCode=D7E2B5
https://dynamic-lecture-system.netlify.app/student-dashboard.html?joinCode=D7E2B5
 */

/* =========================================================
   QR SCANNER FLOW
   ---------------------------------------------------------
   Uses html5-qrcode.

   QR content can be:
   1. D7E2B5
   2. student-dashboard.html?joinCode=D7E2B5
   3. https://dynamic-lecture-system.netlify.app/student-dashboard.html?joinCode=D7E2B5
========================================================= */

let studentQrScanner = null;

function extractJoinCodeFromQrText(qrText) {
    const value = String(qrText || "").trim();

    if (!value) {
        return "";
    }

    try {
        const url = new URL(value);

        return (
            url.searchParams.get("joinCode") ||
            url.searchParams.get("code") ||
            ""
        );
    } catch (error) {
        return value;
    }
}

async function startStudentQrScanner() {
    const box = getElement(
        STUDENT_DASHBOARD_CONFIG.SELECTORS.qrScannerBox
    );

    const reader = getElement(
        STUDENT_DASHBOARD_CONFIG.SELECTORS.qrReader
    );

    if (!box || !reader) {
        showJoinFeedback("error", "QR scanner elements are missing.");
        return;
    }

    if (typeof Html5Qrcode !== "function") {
        showJoinFeedback(
            "error",
            "QR scanner library is not loaded. Check html5-qrcode script."
        );
        return;
    }

    box.hidden = false;

    if (studentQrScanner) {
        return;
    }

    studentQrScanner = new Html5Qrcode("studentQrReader");

    try {
        await studentQrScanner.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: {
                    width: 240,
                    height: 240
                }
            },
            async function onQrSuccess(decodedText) {
                const code = extractJoinCodeFromQrText(decodedText);

                const input = getElement(
                    STUDENT_DASHBOARD_CONFIG.SELECTORS.sessionCodeInput
                );

                if (input) {
                    input.value = code;
                }

                await stopStudentQrScanner();

                showJoinFeedback("success", `זוהה קוד: ${code}`);

                await joinSessionByCode(code);
            },
            function onQrError() {
                // Silent by design.
                // This runs many times while camera searches for QR.
            }
        );
    } catch (error) {
        console.error("Failed to start QR scanner:", error);

        showJoinFeedback(
            "error",
            "לא ניתן לפתוח מצלמה. בדוק הרשאות Camera ושהאתר רץ ב־localhost או HTTPS."
        );

        studentQrScanner = null;
    }
}

async function stopStudentQrScanner() {
    const box = getElement(
        STUDENT_DASHBOARD_CONFIG.SELECTORS.qrScannerBox
    );

    if (!studentQrScanner) {
        if (box) {
            box.hidden = true;
        }

        return;
    }

    try {
        await studentQrScanner.stop();
        studentQrScanner.clear();
    } catch (error) {
        console.warn("Failed to stop QR scanner:", error);
    }

    studentQrScanner = null;

    if (box) {
        box.hidden = true;
    }
}

function setupStudentQrScanner() {
    const scanButtons = document.querySelectorAll(
        STUDENT_DASHBOARD_CONFIG.SELECTORS.scanQrButton
    );

    const stopButtons = document.querySelectorAll(
        STUDENT_DASHBOARD_CONFIG.SELECTORS.stopQrButton
    );

    scanButtons.forEach(function (button) {
        button.addEventListener("click", startStudentQrScanner);
    });

    stopButtons.forEach(function (button) {
        button.addEventListener("click", stopStudentQrScanner);
    });
}

/* 
   MOBILE MENU
 */

function openMobileMenu(mobileNav, toggleButton) {
    mobileNav.hidden = false;
    toggleButton.classList.add("is-open");
    toggleButton.setAttribute("aria-expanded", "true");

    requestAnimationFrame(function () {
        mobileNav.classList.add("is-open");
    });
}

function closeMobileMenu(mobileNav, toggleButton) {
    mobileNav.classList.remove("is-open");
    toggleButton.classList.remove("is-open");
    toggleButton.setAttribute("aria-expanded", "false");

    setTimeout(function () {
        if (!mobileNav.classList.contains("is-open")) {
            mobileNav.hidden = true;
        }
    }, 220);
}

function setupStudentMobileMenu() {
    const toggleButton = getElement(
        STUDENT_DASHBOARD_CONFIG.SELECTORS.mobileMenuButton
    );

    const mobileNav = getElement(
        STUDENT_DASHBOARD_CONFIG.SELECTORS.mobileNav
    );

    if (!toggleButton || !mobileNav) {
        return;
    }

    toggleButton.addEventListener("click", function (event) {
        event.stopPropagation();

        if (mobileNav.hidden) {
            openMobileMenu(mobileNav, toggleButton);
        } else {
            closeMobileMenu(mobileNav, toggleButton);
        }
    });

    mobileNav.addEventListener("click", function (event) {
        event.stopPropagation();

        const clickedItem =
            event.target.closest("a") ||
            event.target.closest("button");

        if (clickedItem) {
            closeMobileMenu(mobileNav, toggleButton);
        }
    });

    document.addEventListener("click", function (event) {
        if (mobileNav.hidden) {
            return;
        }

        const clickedInsideMenu = mobileNav.contains(event.target);
        const clickedToggle = toggleButton.contains(event.target);

        if (!clickedInsideMenu && !clickedToggle) {
            closeMobileMenu(mobileNav, toggleButton);
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !mobileNav.hidden) {
            closeMobileMenu(mobileNav, toggleButton);
        }
    });
}


/* 
   LOGOUT
 */

function handleStudentLogout(event) {
    event.preventDefault();

    localStorage.removeItem(DLS_CONFIG.STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(
        STUDENT_DASHBOARD_CONFIG.STORAGE_KEYS.CURRENT_SESSION
    );

    window.location.href = STUDENT_DASHBOARD_CONFIG.ROUTES.LOGIN;
}

function setupStudentLogout() {
    const logoutButtons = document.querySelectorAll(
        STUDENT_DASHBOARD_CONFIG.SELECTORS.logoutButton
    );

    logoutButtons.forEach(function (button) {
        button.addEventListener("click", handleStudentLogout);
    });
}


/* 
   PAGE INIT
 */

document.addEventListener("DOMContentLoaded", function () {
    updateStudentClock();
    setInterval(updateStudentClock, 1000);

    setupStudentOverlays();
    setupJoinSessionForm();
    setupStudentMobileMenu();
    setupStudentLogout();

    loadStudentDashboard();
    prefillJoinCodeFromUrl();
    renderActiveSession();

    setupStudentQrScanner();
});