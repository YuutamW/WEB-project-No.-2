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
        PRESENTATION: "presentation.html"
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

        sessionsOverlay: "#studentSessionsOverlay",
        sessionSearchInput: "#studentSessionSearchInput",
        sessionsOverlayList: "#studentSessionsOverlayList",
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

    /* Make sure that Sessions will load even if empty cache */
    notesButtons.forEach(function (button) {
        button.addEventListener("click", async function () {
            if (!studentRecentSessionsCache.length) {
                await renderRecentStudentSessions();
            }

            renderStudentSessionsOverlay(studentRecentSessionsCache);
            openStudentOverlay(STUDENT_DASHBOARD_CONFIG.SELECTORS.sessionsOverlay);

            const input = document.querySelector(
                STUDENT_DASHBOARD_CONFIG.SELECTORS.sessionSearchInput
            );

            if (input) {
                input.value = "";
                input.focus();
            }
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

        if (!overlay) {
            return;
        }

        if (overlay.id === "studentSettingsOverlay") {
            requestCloseStudentSettingsOverlay(event);
            return;
        }

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

            resetStudentSettingsView();
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

/* RENDER OF SESSIONS SEARCH OVERLAY FUNCS */
function renderStudentSessionsOverlay(sessions) {
    const list = document.querySelector(
        STUDENT_DASHBOARD_CONFIG.SELECTORS.sessionsOverlayList
    );

    if (!list) {
        return;
    }

    if (!sessions || sessions.length === 0) {
        list.innerHTML = `
            <p class="dashboard-empty-state">
                אין סשנים להצגה.
            </p>
        `;
        return;
    }

    renderStudentSessionCards(list, sessions);
}

function filterStudentSessions(searchText) {
    const query = String(searchText || "").trim().toLowerCase();

    if (!query) {
        return studentRecentSessionsCache;
    }

    return studentRecentSessionsCache.filter(function (session) {
        const title = normalizeStudentSessionTitle(session).toLowerCase();
        const code = getStudentSessionCode(session).toLowerCase();
        const date = formatStudentSessionDate(session).toLowerCase();

        return (
            title.includes(query) ||
            code.includes(query) ||
            date.includes(query)
        );
    });
}

function debounce(callback, delay = 160) {
    let timerId = null;

    return function (...args) {
        clearTimeout(timerId);

        timerId = setTimeout(function () {
            callback(...args);
        }, delay);
    };
}

function setupStudentSessionSearch() {
    const input = document.querySelector(
        STUDENT_DASHBOARD_CONFIG.SELECTORS.sessionSearchInput
    );

    if (!input) {
        return;
    }

    input.addEventListener(
        "input",
        debounce(function () {
            const filteredSessions = filterStudentSessions(input.value);
            renderStudentSessionsOverlay(filteredSessions);
        }, 160)
    );
}
/* END OF SESSIONS SEARCH OVERLAY FUNCS */

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
            sessionCode: STUDENT_DASHBOARD_CONFIG.PRESENTATION_ID
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
//         window.location.href = "presentation.html";
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

/* ==========================================================
   STUDENT SETTINGS
   ----------------------------------------------------------
   Same behavior as lecturer settings:
   - Summary rows
   - Edit form
   - Password validation
   - Delete confirm
   - Abort confirm when closing active action
========================================================== */

function isStrongStudentPassword(password) {
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    return hasUppercase && hasLowercase && hasNumber;
}

function showStudentSettingsFeedback(type, text) {
    const feedback = document.querySelector("#studentSettingsFeedback");

    if (!feedback) {
        return;
    }

    feedback.hidden = false;
    feedback.className = `dashboard-modal__feedback ${type}`;
    feedback.textContent = text;
}

function clearStudentSettingsFeedback() {
    const feedback = document.querySelector("#studentSettingsFeedback");

    if (!feedback) {
        return;
    }

    feedback.hidden = true;
    feedback.textContent = "";
    feedback.className = "dashboard-modal__feedback";
}

function fillStudentSettingsSummary(user) {
    const userIdElement = document.querySelector("#studentSettingsUserId");
    const userEmailElement = document.querySelector("#studentSettingsUserEmail");

    if (userIdElement) {
        userIdElement.textContent = user?.id || user?._id || "לא נמצא";
    }

    if (userEmailElement) {
        userEmailElement.textContent = user?.email || "לא נמצא";
    }
}

function fillStudentSettingsForm() {
    const user = getCurrentDlsUser();

    if (!user) {
        return;
    }

    const firstNameInput = document.querySelector("#studentSettingsFirstName");
    const lastNameInput = document.querySelector("#studentSettingsLastName");
    const emailInput = document.querySelector("#studentSettingsEmail");

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

function clearStudentPasswordFields() {
    const passwordInput = document.querySelector("#studentSettingsPassword");
    const confirmPasswordInput = document.querySelector("#studentSettingsConfirmPassword");

    if (passwordInput) {
        passwordInput.value = "";
    }

    if (confirmPasswordInput) {
        confirmPasswordInput.value = "";
    }
}

function getStudentSettingsFormValues() {
    const firstNameInput = document.querySelector("#studentSettingsFirstName");
    const lastNameInput = document.querySelector("#studentSettingsLastName");
    const emailInput = document.querySelector("#studentSettingsEmail");
    const passwordInput = document.querySelector("#studentSettingsPassword");
    const confirmPasswordInput = document.querySelector("#studentSettingsConfirmPassword");

    return {
        firstName: firstNameInput ? firstNameInput.value.trim() : "",
        lastName: lastNameInput ? lastNameInput.value.trim() : "",
        email: emailInput ? emailInput.value.trim() : "",
        password: passwordInput ? passwordInput.value : "",
        confirmPassword: confirmPasswordInput ? confirmPasswordInput.value : ""
    };
}

function isStudentSettingsFormDirty() {
    const user = getCurrentDlsUser();
    const values = getStudentSettingsFormValues();

    if (!user) {
        return false;
    }

    return (
        values.firstName !== (user.firstName || "") ||
        values.lastName !== (user.lastName || "") ||
        values.email !== (user.email || "") ||
        values.password !== "" ||
        values.confirmPassword !== ""
    );
}

function hideStudentDeleteConfirmBox() {
    const deleteBox = document.querySelector("#studentDeleteUserConfirmBox");

    if (deleteBox) {
        deleteBox.hidden = true;
    }
}

function showStudentDeleteConfirmBox() {
    const deleteBox = document.querySelector("#studentDeleteUserConfirmBox");

    if (deleteBox) {
        deleteBox.hidden = false;
    }
}

function hideStudentAbortSettingsConfirmBox() {
    const abortBox = document.querySelector("#studentAbortSettingsConfirmBox");

    if (abortBox) {
        abortBox.hidden = true;
    }
}

function showStudentAbortSettingsConfirmBox(actionType) {
    const abortBox = document.querySelector("#studentAbortSettingsConfirmBox");
    const message = document.querySelector("#studentAbortSettingsMessage");

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

function getActiveStudentSettingsAction() {
    const editForm = document.querySelector("#studentSettingsEditForm");
    const deleteBox = document.querySelector("#studentDeleteUserConfirmBox");

    if (editForm && !editForm.hidden) {
        return "edit";
    }

    if (deleteBox && !deleteBox.hidden) {
        return "delete";
    }

    return null;
}

function resetStudentSettingsActionPanels() {
    const editForm = document.querySelector("#studentSettingsEditForm");
    const deleteBox = document.querySelector("#studentDeleteUserConfirmBox");

    if (editForm) {
        editForm.hidden = true;
    }

    if (deleteBox) {
        deleteBox.hidden = true;
    }

    hideStudentAbortSettingsConfirmBox();
    clearStudentSettingsFeedback();
    clearStudentPasswordFields();
}

function resetStudentSettingsView() {
    const user = getCurrentDlsUser();

    fillStudentSettingsSummary(user);
    fillStudentSettingsForm();
    resetStudentSettingsActionPanels();
}

function forceCloseStudentSettingsOverlay() {
    const overlay = document.querySelector(
        STUDENT_DASHBOARD_CONFIG.SELECTORS.settingsOverlay
    );

    if (!overlay) {
        return;
    }

    overlay.classList.remove("is-open");

    setTimeout(function () {
        overlay.hidden = true;
        resetStudentSettingsView();
    }, 220);
}

function requestCloseStudentSettingsOverlay(event) {
    if (event) {
        event.preventDefault();
    }

    const activeAction = getActiveStudentSettingsAction();

    if (activeAction === "edit") {
        if (isStudentSettingsFormDirty()) {
            showStudentAbortSettingsConfirmBox("edit");
            return;
        }

        forceCloseStudentSettingsOverlay();
        return;
    }

    if (activeAction === "delete") {
        showStudentAbortSettingsConfirmBox("delete");
        return;
    }

    forceCloseStudentSettingsOverlay();
}

function handleStudentEditUserClick() {
    const user = getCurrentDlsUser();

    if (!user) {
        showStudentSettingsFeedback("error", "לא נמצא משתמש מחובר.");
        return;
    }

    const editForm = document.querySelector("#studentSettingsEditForm");

    clearStudentSettingsFeedback();
    hideStudentDeleteConfirmBox();
    hideStudentAbortSettingsConfirmBox();
    fillStudentSettingsForm();

    if (editForm) {
        editForm.hidden = false;
    }
}

function handleStudentCancelEditUserClick() {
    if (isStudentSettingsFormDirty()) {
        showStudentAbortSettingsConfirmBox("edit");
        return;
    }

    const editForm = document.querySelector("#studentSettingsEditForm");

    if (editForm) {
        editForm.hidden = true;
    }

    clearStudentPasswordFields();
    clearStudentSettingsFeedback();
}

async function handleStudentSettingsSubmit(event) {
    event.preventDefault();

    const user = getCurrentDlsUser();

    if (!user) {
        window.location.href = STUDENT_DASHBOARD_CONFIG.ROUTES.LOGIN;
        return;
    }

    const values = getStudentSettingsFormValues();

    const updatedFields = {
        id: user.id || user._id,
        _id: user._id || user.id,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        role: user.role || "student"
    };

    if (values.password || values.confirmPassword) {
        if (values.password !== values.confirmPassword) {
            showStudentSettingsFeedback("error", "הסיסמאות אינן תואמות.");
            return;
        }

        if (!isStrongStudentPassword(values.password)) {
            showStudentSettingsFeedback(
                "error",
                "הסיסמה חייבת לכלול אות גדולה, אות קטנה ומספר."
            );
            return;
        }

        updatedFields.password = values.password;
    }

    try {
        const updatedUser = await DLS_API.updateUser(updatedFields);
        const serverUser = updatedUser.data || updatedUser.user || updatedUser;

        const savedUser = {
            ...user,
            ...serverUser,
            id: serverUser.id || serverUser._id || user.id || user._id,
            _id: serverUser._id || serverUser.id || user._id || user.id
        };

        localStorage.setItem(
            DLS_CONFIG.STORAGE_KEYS.CURRENT_USER,
            JSON.stringify(savedUser, null, 2)
        );

        renderStudentInfo(savedUser);
        fillStudentSettingsSummary(savedUser);
        fillStudentSettingsForm();

        const editForm = document.querySelector("#studentSettingsEditForm");

        if (editForm) {
            editForm.hidden = true;
        }

        clearStudentPasswordFields();
        showStudentSettingsFeedback("success", "המשתמש עודכן בהצלחה.");
    } catch (error) {
        showStudentSettingsFeedback(
            "error",
            error.message || "עדכון משתמש נכשל."
        );
    }
}

function handleStudentDeleteUserClick() {
    const editForm = document.querySelector("#studentSettingsEditForm");

    clearStudentSettingsFeedback();
    hideStudentAbortSettingsConfirmBox();

    if (editForm) {
        editForm.hidden = true;
    }

    showStudentDeleteConfirmBox();
}

function handleStudentCancelDeleteUserClick() {
    hideStudentDeleteConfirmBox();
    clearStudentSettingsFeedback();
}

async function handleStudentConfirmDeleteUserClick() {
    const user = getCurrentDlsUser();

    if (!user) {
        window.location.href = STUDENT_DASHBOARD_CONFIG.ROUTES.LOGIN;
        return;
    }

    const userId = user.id || user._id;

    if (!userId) {
        showStudentSettingsFeedback("error", "לא נמצא מזהה משתמש למחיקה.");
        return;
    }

    try {
        await DLS_API.deleteUser(userId);

        localStorage.removeItem(DLS_CONFIG.STORAGE_KEYS.CURRENT_USER);
        localStorage.removeItem(DLS_CONFIG.STORAGE_KEYS.CURRENT_SESSION);

        window.location.href = STUDENT_DASHBOARD_CONFIG.ROUTES.LOGIN;
    } catch (error) {
        showStudentSettingsFeedback(
            "error",
            error.message || "מחיקת משתמש נכשלה."
        );
    }
}

function handleStudentConfirmAbortSettingsClick() {
    resetStudentSettingsActionPanels();
    forceCloseStudentSettingsOverlay();
}

function handleStudentCancelAbortSettingsClick() {
    hideStudentAbortSettingsConfirmBox();
}

function setupStudentSettingsForm() {
    const form = document.querySelector("#studentSettingsEditForm");

    const editButton = document.querySelector(
        "[data-student-action='edit-student-user']"
    );

    const deleteButton = document.querySelector(
        "[data-student-action='delete-student-user']"
    );

    const cancelEditButton = document.querySelector(
        "[data-student-action='cancel-settings-edit']"
    );

    const cancelDeleteButton = document.querySelector(
        "[data-student-action='cancel-delete-student']"
    );

    const confirmDeleteButton = document.querySelector(
        "[data-student-action='confirm-delete-student']"
    );

    const requestCloseButtons = document.querySelectorAll(
        "[data-student-action='request-close-student-settings']"
    );

    const confirmAbortButton = document.querySelector(
        "[data-student-action='confirm-abort-student-settings']"
    );

    const cancelAbortButton = document.querySelector(
        "[data-student-action='cancel-abort-student-settings']"
    );

    if (form) {
        form.addEventListener("submit", handleStudentSettingsSubmit);
    }

    if (editButton) {
        editButton.addEventListener("click", handleStudentEditUserClick);
    }

    if (deleteButton) {
        deleteButton.addEventListener("click", handleStudentDeleteUserClick);
    }

    if (cancelEditButton) {
        cancelEditButton.addEventListener("click", handleStudentCancelEditUserClick);
    }

    if (cancelDeleteButton) {
        cancelDeleteButton.addEventListener("click", handleStudentCancelDeleteUserClick);
    }

    if (confirmDeleteButton) {
        confirmDeleteButton.addEventListener("click", handleStudentConfirmDeleteUserClick);
    }

    requestCloseButtons.forEach(function (button) {
        button.addEventListener("click", requestCloseStudentSettingsOverlay);
    });

    if (confirmAbortButton) {
        confirmAbortButton.addEventListener("click", handleStudentConfirmAbortSettingsClick);
    }

    if (cancelAbortButton) {
        cancelAbortButton.addEventListener("click", handleStudentCancelAbortSettingsClick);
    }

    resetStudentSettingsView();
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

function formatStudentSessionDate(session) {
    const rawDate =
        session?.date ||
        session?.createdAt ||
        session?.joinedAt ||
        session?.updatedAt ||
        "";

    const date = new Date(rawDate);

    if (!rawDate || Number.isNaN(date.getTime())) {
        return "תאריך לא ידוע";
    }

    return date.toLocaleString("he-IL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

/* Last Sessions NAme FIx UNDEFINED NAMING */
function normalizeStudentSessionTitle(session) {
    const rawTitle = String(session?.title || session?.name || "").trim();

    const cleanedTitle = rawTitle
        .replace(/^\((.*)\)$/, "$1")
        .replace(/^Session:\((.*)\)$/i, "$1")
        .trim();

    const invalidTitles = [
        "",
        "undefined",
        "(undefined)",
        "null",
        "(null)"
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

function getStudentSessionCode(session) {
    return session?.code || session?.id || "";
}

/* ==========================================================
   STUDENT RECENT SESSIONS
   ----------------------------------------------------------
   Loads recent sessions, normalizes broken backend titles,
   and supports the My Sessions search overlay.
========================================================== */

let studentRecentSessionsCache = [];

function formatStudentSessionDate(session) {
    const rawDate =
        session?.date ||
        session?.createdAt ||
        session?.joinedAt ||
        session?.updatedAt ||
        "";

    const date = new Date(rawDate);

    if (!rawDate || Number.isNaN(date.getTime())) {
        return "תאריך לא ידוע";
    }

    return date.toLocaleString("he-IL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function getStudentSessionCode(session) {
    return session?.code || session?.id || "";
}

function normalizeStudentSessionTitle(session) {
    const rawTitle = String(session?.title || session?.name || "").trim();

    const cleanedTitle = rawTitle
        .replace(/^\((.*)\)$/, "$1")
        .replace(/^Session:\((.*)\)$/i, "$1")
        .trim();

    const invalidTitles = [
        "",
        "undefined",
        "(undefined)",
        "null",
        "(null)"
    ];

    if (!invalidTitles.includes(cleanedTitle)) {
        return cleanedTitle;
    }

    const code = getStudentSessionCode(session);

    if (code) {
        return `סשן ${code}`;
    }

    return "סשן ללא שם";
}

function renderStudentSessionCards(container, sessions) {
    container.innerHTML = "";

    const fragment = document.createDocumentFragment();

    sessions.forEach(function (session) {
        const sessionCode = getStudentSessionCode(session);
        const sessionTitle = normalizeStudentSessionTitle(session);
        const sessionDate = formatStudentSessionDate(session);

        const card = document.createElement("a");

        card.href = '#';
        card.className = "session-card";

        card.innerHTML = `
            <div class="session-card__info">
                <h4 class="session-card__title"></h4>
                <span class="session-card__date"></span>
            </div>

            <div class="session-card__action">▶</div>
        `;

        card.querySelector(".session-card__title").textContent = sessionTitle;
        card.querySelector(".session-card__date").textContent = sessionDate;

        // Wiring up the click event to trigger joinSessionByCode 
        card.addEventListener("click", async function (event) {
            event.preventDefault();
            
            try {
                await joinSessionByCode(sessionCode);
            } catch (error) {
                console.error("Failed to join session from card:", error);
                // Fallback alert since the card isn't tied to the form feedback UI
                alert(error.message || "הצטרפות לסשן נכשלה.");
            }
        });

        fragment.appendChild(card);
    });

    container.appendChild(fragment);
}

async function renderRecentStudentSessions() {
    const container = document.querySelector("#studentRecentSessionsList");

    if (!container) {
        return;
    }

    try {
        const sessions = await DLS_API.getRecentSessions(8);

        studentRecentSessionsCache = Array.isArray(sessions)
            ? sessions
            : [];

        if (studentRecentSessionsCache.length === 0) {
            container.innerHTML = `
                <p class="dashboard-empty-state">
                    אין סשנים קודמים להצגה.
                </p>
            `;
            return;
        }

        renderStudentSessionCards(container, studentRecentSessionsCache);
    } catch (error) {
        console.error("Failed to Load recent Sessions:", error);

        container.innerHTML = `
            <p class="dashboard-empty-state" style="color: #ff637d;">
                שגיאה בטעינת סשנים.
            </p>
        `;
    }
}

function renderStudentSessionsOverlay(sessions) {
    const list = document.querySelector("#studentSessionsOverlayList");

    if (!list) {
        return;
    }

    if (!sessions || sessions.length === 0) {
        list.innerHTML = `
            <p class="dashboard-empty-state">
                אין סשנים להצגה.
            </p>
        `;
        return;
    }

    renderStudentSessionCards(list, sessions);
}

function filterStudentSessions(searchText) {
    const query = String(searchText || "").trim().toLowerCase();

    if (!query) {
        return studentRecentSessionsCache;
    }

    return studentRecentSessionsCache.filter(function (session) {
        const title = normalizeStudentSessionTitle(session).toLowerCase();
        const code = getStudentSessionCode(session).toLowerCase();
        const date = formatStudentSessionDate(session).toLowerCase();

        return (
            title.includes(query) ||
            code.includes(query) ||
            date.includes(query)
        );
    });
}

function debounce(callback, delay = 160) {
    let timerId = null;

    return function (...args) {
        clearTimeout(timerId);

        timerId = setTimeout(function () {
            callback(...args);
        }, delay);
    };
}

function setupStudentSessionSearch() {
    const input = document.querySelector("#studentSessionSearchInput");

    if (!input) {
        return;
    }

    input.addEventListener(
        "input",
        debounce(function () {
            const filteredSessions = filterStudentSessions(input.value);
            renderStudentSessionsOverlay(filteredSessions);
        }, 160)
    );
}

/* 
   PAGE INIT
 */
document.addEventListener("DOMContentLoaded", function () {
    setupDashboardCore();

    setupStudentOverlays();
    setupJoinSessionForm();
    setupStudentSettingsForm();
    setupStudentSessionSearch();

    loadStudentDashboard();
    prefillJoinCodeFromUrl();
    renderActiveSession();
    setupStudentQrScanner();
    renderRecentStudentSessions();
});