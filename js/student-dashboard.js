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

    SELECTORS: {
        studentName: "#studentName",
        studentEmail: "#studentEmail",
        questionsList: "#studentQuestionsList",
        emptyState: "#studentQuestionsEmpty",
        errorMessage: "#studentDashboardError",
        joinLectureButton: "#joinLectureButton"
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

    setText("#studentRole", user.role || "student");
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
function setupStudentDashboardActions() {
    const joinButton = getElement(
        STUDENT_DASHBOARD_CONFIG.SELECTORS.joinLectureButton
    );

    if (!joinButton) {
        return;
    }

    joinButton.addEventListener("click", function () {
        window.location.href = "presentetion.html";
    });
}


/* 
    Page Init
   Run after HTML is loaded.
 */
document.addEventListener("DOMContentLoaded", function () {
    setupStudentDashboardActions();
    loadStudentDashboard();
});