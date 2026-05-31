// Dor Mandel :       ID: 315313825
// Yotam Weintraub:   ID: 321610859

/*
QUESTION MANAGER:

1. Create Question
2. Save Question in: presentationData;
3. Save Question to: localStorage;
4. Load Questions from: localStorage;
5. present 'markers' on DOM layer;
6. calculate heatmap data to: Dashboard;

Template of QuestionJSON:
---
const dlsQuestionStore = {
  version: 1,

  presentations: {
    "demo-presentation": {
      presentationId: "demo-presentation",
      fileName: "lecture.pdf",

      questions: [
        {
          id: "q_001",
          page: 1,
          x: 0.42,
          y: 0.31,
          text: "Can you explain this?",
          status: "open",
          isAnonymous: true,
          createdAt: "2026-05-29T20:15:00.000Z"
        },
        {
          id: "q_002",
          page: 2,
          x: 0.2,
          y: 0.7,
          text: "What does this mean?",
          status: "open",
          isAnonymous: true,
          createdAt: "2026-05-29T20:20:00.000Z"
        }
      ]
    }
  }
};

---

Dashboard can read: 
const data = JSON.parse(localStorage.getItem("dlsQuestionStore"));
and calculate:
how many Questions;
which page has most Questions;
where is teh Question Density;
How many open Questions pressed / answered ?;

---

for HEATMAP::
Question = relative point in screen;
a lot of close Dots = HeatZone;
WEXAMPLE:
questions = [
  { page: 3, x: 0.42, y: 0.31 },
  { page: 3, x: 0.43, y: 0.32 },
  { page: 3, x: 0.44, y: 0.30 }
]

-- if there are a lot of questions in page 3 
-- students didnt understand it probably

------
Phase 1:
<STORE>

createQuestion()
saveQuestion()
loadQuestionStore()
saveQuestionStore()
getQuestionsForPage()
getQuestionStats()

------
Phase 2:
<INJECTION>

in presentation:
Shift + Click
↓
createQuestion at current page + relative x/y
↓
save to localStorage
↓
render marker on domLayer

Phase 3:
<PAGE_REDRAW>

clear domLayer
load questions for current page
render question markers

Phase 4:
<DASHBOARD_STATS>

load question store
count all questions
count by page
show basic stats

Phase 5:
<HEATMAP>

group questions by page
group by x/y grid cells
draw hot areas

---
*/

/* ==========================================================
   DLS QUESTION MANAGER
   File: js/question-manager.js

   Purpose:
   - Create question objects.
   - Save questions in localStorage.
   - Load questions from localStorage.
   - Return questions by presentation/page.
   - Calculate simple dashboard stats.

   Important:
   This is a frontend-only POC.
   localStorage is local to this browser only.
   It is not a real shared database.
========================================================== */

/* ==========================================================
   JS MAP

   1. Constants
      Storage key and default values.

   2. Store Helpers
      Load / save / reset the whole question store.

   3. ID Helpers
      Create simple unique IDs for questions/presentations.

   4. Presentation Helpers
      Make sure a presentation exists in the store.

   5. Question Factory
      Create a normalized question object.

   6. Question Save / Read API
      Save and get questions.

   7. Stats Helpers
      Calculate data for dashboard / future heatmap.

========================================================== */

/* ==========================================================
   1. Constants
   Purpose:
   Keep localStorage key and default values in one place.
========================================================== */

const QUESTION_STORE_STORAGE_KEY = "dlsQuestionStore";

const DEFAULT_PRESENTATION_ID = "demo-presentation";

/* ==========================================================
   2. Store Helpers
   Purpose:
   Load and save the full question store from localStorage.
========================================================== */

/*
   Creates the default shape of the question store.

   Structure:
   {
      version: 1,
      presentations: {
          "presentation-id": {
              presentationId,
              fileName,
              questions: []
          }
      }
   }
*/
export function createEmptyQuestionStore() {
    return {
        version: 1,
        presentations: {}
    };
}


/*
   Loads the question store from localStorage.

   localStorage can only store strings, so we use:
   JSON.parse() -> string back to object
*/
export function loadQuestionStore() {
    const savedStoreJson = localStorage.getItem(QUESTION_STORE_STORAGE_KEY);

    if (!savedStoreJson) {
        return createEmptyQuestionStore();
    }

    try {
        return JSON.parse(savedStoreJson);
    } catch (error) {
        console.warn("Question store JSON was invalid. Resetting store.", error);

        localStorage.removeItem(QUESTION_STORE_STORAGE_KEY);

        return createEmptyQuestionStore();
    }
}


/*
   Saves the full question store to localStorage.

   JSON.stringify() converts the object into text.
   null, 2 makes the JSON readable in DevTools.
*/
export function saveQuestionStore(questionStore) {
    localStorage.setItem(
        QUESTION_STORE_STORAGE_KEY,
        JSON.stringify(questionStore, null, 2)
    );
}


/*
   Deletes all saved questions from this browser.

   Useful for development/testing.
*/
export function clearQuestionStore() {
    localStorage.removeItem(QUESTION_STORE_STORAGE_KEY);
}


/* ==========================================================
   3. ID Helpers
   Purpose:
   Create simple unique IDs for POC data.
========================================================== */

export function createQuestionId() {
    return `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}


/*
   Creates a safe presentation ID.

   For now:
   - If we have a file name, use it.
   - If not, use demo-presentation.

   Example:
   "lecture 1.pdf" -> "lecture-1-pdf"
*/
export function createPresentationId(fileName) {
    if (!fileName) {
        return DEFAULT_PRESENTATION_ID;
    }

    return fileName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\u0590-\u05ff]+/gi, "-")
        .replace(/^-+|-+$/g, "");
}


/* ==========================================================
   4. Presentation Helpers
   Purpose:
   Make sure a presentation exists inside the store.
========================================================== */

export function ensurePresentationInStore(questionStore, presentationId, fileName) {
    if (!questionStore.presentations[presentationId]) {
        questionStore.presentations[presentationId] = {
            presentationId: presentationId,
            fileName: fileName || null,
            questions: []
        };
    }

    return questionStore.presentations[presentationId];
}


/* ==========================================================
   5. Question Factory
   Purpose:
   Create a clean question object from page + relative point.
========================================================== */

/*
   A question is NOT drawn into the PDF.

   It is saved as data:
   - page number
   - relative x/y position
   - text
   - status
   - time

   x/y are relative:
   x = 0.5 means center of page horizontally.
   y = 0.5 means center of page vertically.
*/
export function createQuestion(questionData) {
    return {
        id: createQuestionId(),

        type: "question",

        presentationId: questionData.presentationId || DEFAULT_PRESENTATION_ID,
        fileName: questionData.fileName || null,

        page: questionData.page,

        x: questionData.x,
        y: questionData.y,

        text: questionData.text || "",
        status: questionData.status || "open",

        color: questionData.color || "#ff3b6b",

        studentName: questionData.studentName || "Anonymous",
        isAnonymous: questionData.isAnonymous !== false,

        createdAt: new Date().toISOString(),
        updatedAt: null
    };
}


/* ==========================================================
   6. Question Save / Read API
   Purpose:
   Save questions and retrieve them later.
========================================================== */

export function saveQuestion(question) {
    const questionStore = loadQuestionStore();

    const presentationId =
        question.presentationId || DEFAULT_PRESENTATION_ID;

    const presentationQuestions = ensurePresentationInStore(
        questionStore,
        presentationId,
        question.fileName
    );

    presentationQuestions.questions.push(question);

    saveQuestionStore(questionStore);

    return question;
}


export function createAndSaveQuestion(questionData) {
    const question = createQuestion(questionData);

    return saveQuestion(question);
}


export function getQuestionsForPresentation(presentationId) {
    const questionStore = loadQuestionStore();

    const presentation = questionStore.presentations[presentationId];

    if (!presentation) {
        return [];
    }

    return presentation.questions || [];
}


export function getQuestionsForPage(presentationId, pageNumber) {
    const questions = getQuestionsForPresentation(presentationId);

    return questions.filter(function (question) {
        return question.page === pageNumber;
    });
}


/* ==========================================================
   7. Stats Helpers
   Purpose:
   Prepare real data for dashboard and future heatmap.
========================================================== */

export function getQuestionStats(presentationId) {
    const questions = getQuestionsForPresentation(presentationId);

    const stats = {
        totalQuestions: questions.length,
        openQuestions: 0,
        answeredQuestions: 0,
        questionsByPage: {},
        hottestPage: null
    };

    questions.forEach(function (question) {
        if (question.status === "answered") {
            stats.answeredQuestions += 1;
        } else {
            stats.openQuestions += 1;
        }

        if (!stats.questionsByPage[question.page]) {
            stats.questionsByPage[question.page] = 0;
        }

        stats.questionsByPage[question.page] += 1;
    });

    let maxQuestionsOnPage = 0;

    Object.keys(stats.questionsByPage).forEach(function (pageNumber) {
        const count = stats.questionsByPage[pageNumber];

        if (count > maxQuestionsOnPage) {
            maxQuestionsOnPage = count;
            stats.hottestPage = Number(pageNumber);
        }
    });

    return stats;
}


/*
   Debug helper:
   Lets us inspect the store from DevTools.

   Example:
   dlsQuestionDebug.loadQuestionStore()
*/
window.dlsQuestionDebug = {
    loadQuestionStore,
    saveQuestionStore,
    clearQuestionStore,
    createAndSaveQuestion,
    getQuestionsForPresentation,
    getQuestionsForPage,
    getQuestionStats
};