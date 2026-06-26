// Dor Mandel :       ID: 315313825
// Yotam Weintraub:   ID: 321610859
/* ==========================================================
   DLS SUMMARY MANAGER
   File: js/summary.js

   Purpose:
   - Load saved questions from localStorage.
   - Show question statistics.
   - Group questions by PDF page.
   - Allow returning to the exact question in presentation page.
========================================================== */

import {

    loadQuestionStore,
    getQuestionStats
} from "./question-manager.js";

/* 1. Constants - Default Values */

const DEFAULT_PRESENTATION_ID = "demo-presentation";

/* 2. DOM References - Connect JS to HTML elements */

const summaryTotalQuestions = document.getElementById("summaryTotalQuestions");
const summaryOpenQuestions = document.getElementById("summaryOpenQuestions");
const summaryHottestPage = document.getElementById("summaryHottestPage");
const summaryQuestionsList = document.getElementById("summaryQuestionsList");
const summaryRefreshButton = document.getElementById("summaryRefreshButton");
const summaryBackToPresentationButton = document.getElementById("summaryBackToPresentationButton");

/* 3. URL Helpers - Read Presentation ID from URL : example :  summary.html?presentation=lecture-demo-pdf */
function getPresentationIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("presentation") || DEFAULT_PRESENTATION_ID;
}

/* 4. Data Helpers - Read Questions from localStoragfe for one Presentation */
function getQuestionsForSummary(presentationId) {
    const store = loadQuestionStore();

    /* DEBUG PRINT to console */
    console.log("Summary presentationId:", presentationId);
    console.log("Full question store:", store);

    const presentation = store.presentations[presentationId];

    if (!presentation) {
        console.warn("No presentation found in question store:", presentationId);
        return [];
    }

    return presentation.questions || [];
}

/* ==========================================================
   5. Grouping Logic
   
   Group questions by their PDF page.

   Input:
   [
       { page: 1, text: "..." },
       { page: 3, text: "..." },
       { page: 1, text: "..." }
   ]

   Output:
   {
       1: [question, question],
       3: [question]
   }
========================================================== */

function groupQuestionsByPage(questions) {
    const groups = {};

    questions.forEach(function (question) {
        const pageNumber = question.page || 1;

        if (!groups[pageNumber]) {
            groups[pageNumber] = [];
        }

        groups[pageNumber].push(question);
    });

    return groups;
}


/* ==========================================================
   6. Stats Rendering
   Purpose:
   Fill the top summary cards.
========================================================== */

function renderStats(presentationId) {
    const stats = getQuestionStats(presentationId);

    console.log("Summary stats:", stats);

    if (summaryTotalQuestions) {
        summaryTotalQuestions.textContent = stats.totalQuestions || 0;
    }

    if (summaryOpenQuestions) {
        summaryOpenQuestions.textContent = stats.openQuestions || 0;
    }

    if (summaryHottestPage) {
        summaryHottestPage.textContent = stats.hottestPage || "-";
    }
    /* Since no DB - will display random number */
}


/* ==========================================================
   7. Empty State
   Purpose:
   Show a friendly message when no questions exist.
========================================================== */

function renderEmptyState() {
    summaryQuestionsList.innerHTML = `
        <section class="summary-empty-state">
            No saved questions were found for this presentation.
        </section>
    `;
}

/* ==========================================================
   8. Jump URL Builder
   Purpose:
   Create a link back to the presentation page.

   Example result:
   presentation.html?presentation=abc&page=3&q=q_123
========================================================== */

function createQuestionJumpUrl(question, presentationId) {
    const params = new URLSearchParams();

    params.set("presentation", presentationId);
    params.set("page", question.page);
    params.set("q", question.id);

    return `presentation.html?${params.toString()}`;
}


/* ==========================================================
   9. Question Item Rendering
   Purpose:
   Create one clickable question card.
   Clicking the card returns to the presentation page with:
   - presentation id
   - page number
   - question id
========================================================== */

function renderQuestionItem(question, presentationId) {
    const item = document.createElement("button");

    item.className = "summary-question-item";
    item.type = "button";

    item.innerHTML = `
        <div class="summary-question-item__top">
            <span class="summary-question-item__page">
                Page ${question.page || 1}
            </span>

            <span class="summary-question-item__status">
                ${question.status || "open"}
            </span>
        </div>

        <p class="summary-question-item__text">
            ${question.text || "No question text"}
        </p>

        <div class="summary-question-item__meta">
            ${question.isAnonymous ? "Anonymous" : question.studentName || "Student"}
            · Click to return to question
        </div>
    `;

    item.addEventListener("click", function () {
        window.location.href =
            createQuestionJumpUrl(question, presentationId);
    });

    return item;
}


/* ==========================================================
   10. Page Group Rendering
   Purpose:
   Create one section for a page and its questions.
========================================================== */

function renderPageGroup(pageNumber, questions, presentationId) {
    const group = document.createElement("section");

    group.className = "summary-page-group";

    const title = document.createElement("h2");

    title.className = "summary-page-group__title";
    title.textContent = `Page ${pageNumber}`;

    group.appendChild(title);

    questions.forEach(function (question) {
        group.appendChild(
            renderQuestionItem(question, presentationId)
        );
    });

    summaryQuestionsList.appendChild(group);
}


/* ==========================================================
   11. Questions Rendering
   Purpose:
   Render all questions grouped by page.
========================================================== */

function renderQuestionGroups(presentationId) {
    if (!summaryQuestionsList) {
        console.error("summaryQuestionsList element was not found in summary.html");
        return;
    }

    const questions = getQuestionsForSummary(presentationId);

    /* DEBUG PRINT summary questions */
    console.log("Summary questions:", questions);
    
    summaryQuestionsList.innerHTML = "";

    if (questions.length === 0) {
        renderEmptyState();
        return;
    }

    const groups = groupQuestionsByPage(questions);

    const sortedPageNumbers = Object.keys(groups)
        .map(Number)
        .sort(function (a, b) {
            return a - b;
        });

    sortedPageNumbers.forEach(function (pageNumber) {
        const pageQuestions = groups[pageNumber];

        pageQuestions.sort(function (a, b) {
            return String(a.createdAt).localeCompare(String(b.createdAt));
        });

        renderPageGroup(
            pageNumber,
            pageQuestions,
            presentationId
        );
    });
}


/* ==========================================================
   12. Back Button Setup
   Purpose:
   Preserve presentation id when returning to presentation.
========================================================== */

function setupBackButton(presentationId) {
    const params = new URLSearchParams();

    params.set("presentation", presentationId);

    summaryBackToPresentationButton.href =
        `presentation.html?${params.toString()}`;
}


/* ==========================================================
   13. Main Render
   Purpose:
   Refresh the whole summary page.
========================================================== */

function renderSummaryPage() {
    const presentationId = getPresentationIdFromUrl();

    renderStats(presentationId);
    renderQuestionGroups(presentationId);
    setupBackButton(presentationId);
}


/* ==========================================================
   14. Events
   Purpose:
   Connect buttons to behavior.
========================================================== */
function connectEvents() {
    summaryRefreshButton.addEventListener("click", function () {
        renderSummaryPage();
    });
}


/* ==========================================================
   15. Init
   Purpose:
   Start the summary page.
========================================================== */
function initSummaryPage() {
    connectEvents();
    renderSummaryPage();
}

initSummaryPage();