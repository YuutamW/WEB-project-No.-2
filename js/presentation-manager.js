// Load PDF.js
/* ==========================================================
   DLS PRESENTATION MANAGER
   File: js/presentation-manager.js

   Purpose:
   - Control the DLS presentation mockup page.
   - Handle upload behavior.
   - Handle teacher toolbar visibility.
   - Handle active tool selection.
   - Open matching tool options panel.
   - Handle Stop / Image / Laser basic behavior.
========================================================== */


/* ==========================================================
   JS MAP

   1. DOM References
      Get all important HTML elements.

   2. App State
      Store current file, active tool and tool settings.

   3. Init
      Start the page and connect all events.

   4. Event Connections
      Connect buttons, inputs and mouse movement.

   5. File Upload Handling
      Detect PDF / PPT / PPTX and hide upload panel.

   6. Teacher Controls Visibility
      Show toolbar when mouse is in lower third.

   7. Tool Selection
      Change active tool and button highlight.

   8. Tool Options Panel
      Show Pen / Eraser / Laser options only when needed.

   9. Tool Inputs
      Save pen, eraser and laser values.

   10. Image Tool
      Open hidden image picker.

   11. Laser Pointer
      Show and move the laser pointer.

   12. Stop Presentation
      Show end screen.

   13. Helpers
      Small utility functions.
========================================================== */
/* impord PDF API Viewer */
import { createPdfViewerManager } from "./pdf-viewer.js";
/* Question manager on DOM layer */
import {
    createAndSaveQuestion,
    createPresentationId,
    getQuestionsForPage,
    getQuestionsForPresentation
} from "./question-manager.js";

/* ==========================================================
   1. DOM References
   Purpose:
   Save references to HTML elements we need to control.
========================================================== */

/* Page shell */
const presentationPage = document.getElementById("presentationPage");

/* Upload elements */
const uploadPanel = document.getElementById("uploadPanel");
const presentationFileInput = document.getElementById("presentationFileInput");
const presentationStatusText = document.getElementById("presentationStatusText");

/* Main slide elements */
const slideWrapper = document.getElementById("slideWrapper");
const pdfCanvas = document.getElementById("pdfCanvas");
const annotationCanvas = document.getElementById("annotationCanvas");
const domLayer = document.getElementById("domLayer");

/* PDF navigation elements */
const pdfNavigationControls = document.getElementById("pdfNavigationControls");
const previousPdfPageButton = document.getElementById("previousPdfPageButton");
const nextPdfPageButton = document.getElementById("nextPdfPageButton");
const pdfPageIndicator = document.getElementById("pdfPageIndicator");

// ---


/* Teacher toolbar */
const teacherControls = document.getElementById("teacherControls");
const toolButtons = document.querySelectorAll(".teacher-controls__button--tool");

/* Tool options panel */
const toolOptionsPanel = document.getElementById("toolOptionsPanel");
const toolOptionsGroups = document.querySelectorAll(".tool-options-panel__group");

/* Pen options */
const penColorInput = document.getElementById("penColorInput");
const penSizeInput = document.getElementById("penSizeInput");

/* Eraser options */
const eraserSizeInput = document.getElementById("eraserSizeInput");

/* Laser options */
const laserColorInput = document.getElementById("laserColorInput");
const laserPointer = document.getElementById("laserPointer");

/* Image tool */
const imageUploadInput = document.getElementById("imageUploadInput");

/* Side tab */
const switchPresentationButton = document.getElementById("switchPresentationButton");

/* Stop / End screen */
const stopPresentationButton = document.getElementById("stopPresentationButton");
const endScreen = document.getElementById("endScreen");

/* Show / Hide Question MArkers */
const questionMarkerToggleButton = document.getElementById("questionMarkersToggleButton");

/* Question Compose Popup - for JS control  QuestionAddInput Popup */
const questionComposePopup = document.getElementById("questionComposePopup");
const questionComposeInput = document.getElementById("questionComposeInput");
const questionComposeSaveButton = document.getElementById("questionComposeSaveButton");
const questionComposeCancelButton = document.getElementById("questionComposeCancelButton");
const questionComposeCloseButton = document.getElementById("questionComposeCloseButton");

/* Q&A drawer Elements */
const qaDrawerCount = document.getElementById("qaDrawerCount");
const qaDrawerList = document.getElementById("qaDrawerList");
const qaShowAllButton = document.getElementById("qaShowAllButton");
const qaShowCurrentPageButton = document.getElementById("qaShowCurrentPageButton");


/* ==========================================================
   2. App State
   Purpose:
   Keep the current page/tool state in one organized object.
========================================================== */

const presentationState = {
    currentFile: null,
    activeTool: null,

    penColor: "#ff7a90",
    penSize: 4,

    eraserSize: 4,

    laserColor: "#ff3b3b",

    questionMarkersVisible: false,
    questionMarkerColor: "#ff3b6b"
};

/* --Added Helper Vars-- */

let toolOptionsHideTimer = null;

let teacherControlsHideTimer = null;

let shouldKeepToolbarHiddenUntilMouseLeavesBottom = false;

let pendingQuestionDraft = null;

let qaDrawerFilter = "all";

/* ==========================================================
   2.1 Presentation Data JSON
   Purpose:
   Store page-based annotations, objects and questions.
   This is the layer that will later be saved/exported.
========================================================== */

const presentationData = {
    fileName: null,
    currentPage: 1,
    totalPages: 0,

    pages: {}
};

/* ==========================================================
   PDF Viewer Manager
   Purpose:
   Handles PDF loading and rendering.
========================================================== */

const pdfViewerManager = createPdfViewerManager({
    slideWrapper: slideWrapper,
    pdfCanvas: pdfCanvas,
    annotationCanvas: annotationCanvas,
    domLayer: domLayer,

    onStatus: updateStatus,
    onPageChange: handlePdfPageChange
});

/* ==========================================================
   3. Init
   Purpose:
   Starts the page logic after the file is loaded.
========================================================== */

function initPresentationPage() {
    connectEvents();

    /* no tool selected when selected PDF */
    clearActiveTool();

    updateStatus("Presentation page ready.");
}

initPresentationPage();


/* ==========================================================
   4. Event Connections
   Purpose:
   Connect HTML elements to JavaScript actions.
========================================================== */

function connectEvents() {
    /* File upload */
    presentationFileInput.addEventListener("change", handlePresentationFileUpload);

    /* PDF page navigation */
    if (previousPdfPageButton && nextPdfPageButton) {
        previousPdfPageButton.addEventListener("click", goToPreviousPdfPage);
        nextPdfPageButton.addEventListener("click", goToNextPdfPage);
    }

    /* Click position testing for Q / annotation points */
    annotationCanvas.addEventListener("pointerdown", handleAnnotationCanvasPointerDown);

    /* Toolbar visibility + laser movement */
    document.addEventListener("mousemove", handlePageMouseMove);

    /* Tool buttons */
    toolButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            const selectedTool = button.dataset.tool;
            setActiveTool(selectedTool);
        });
    });

    /* Tool option inputs */
    penColorInput.addEventListener("input", updatePenColor);
    penSizeInput.addEventListener("input", updatePenSize);

    eraserSizeInput.addEventListener("input", updateEraserSize);

    laserColorInput.addEventListener("input", updateLaserColor);

    /* Image tool picker */
    imageUploadInput.addEventListener("change", handleImageUpload);

    /* Side tab: open file picker again (opened twice Bc ;setActiveTool("switch");)*/
    // switchPresentationButton.addEventListener("click", openPresentationPicker);

    /* Stop presentation */
    stopPresentationButton.addEventListener("click", stopPresentation);

    /* Show / Hide Questions Markers */
    if (questionMarkerToggleButton) {
        questionMarkerToggleButton.addEventListener("click", toggleQuestionMarkerVisibility);
    }

    /* Add PopUp for add Text when adding Dot of Question on PDF */
    if (questionComposeSaveButton) {
        questionComposeSaveButton.addEventListener("click", savePendingQuestionFromPopup);
    }
    if (questionComposeCancelButton) {
        questionComposeCancelButton.addEventListener("click", closeQuestionComposePopup);
    }
    if (questionComposeCloseButton) {
        questionComposeCloseButton.addEventListener("click", closeQuestionComposePopup);
    }

    /* Added Save with Enter Press */
    if (questionComposeInput) {
        questionComposeInput.addEventListener("keydown", function (event) {
            if (event.key === "Enter" && event.ctrlKey) {
                savePendingQuestionFromPopup();
            }
            if (event.key === "Escape") {
                closeQuestionComposePopup();
            }
        });
    }

    /* Question Drawer Functionality */
    if (qaShowAllButton) {
        qaShowAllButton.addEventListener("click", function () {
            setQaDrawerFilter("all");
        });
    }

    if (qaShowCurrentPageButton) {
        qaShowCurrentPageButton.addEventListener("click", function () {
            setQaDrawerFilter("currentPage");
        });
    }
}


/* ==========================================================
   5. File Upload Handling
   Purpose:
   Detect selected file type and update the mockup state.
   await = async func - not to stuck the flow
========================================================== */

async function handlePresentationFileUpload(event) {
    const file = event.target.files[0];

    if (!file) {
        updateStatus("No file selected.");
        return;
    }

    presentationState.currentFile = file;

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".pdf")) {
        updateStatus("PDF selected. Loading...");

        activatePresentationMode();

        try {
            await pdfViewerManager.loadPdfFile(file);
        } catch (error) {
            console.error("PDF loading failed:", error);
            updateStatus("PDF loading failed. Check console.");
        }

        return;
    }

    if (fileName.endsWith(".ppt") || fileName.endsWith(".pptx")) {
        updateStatus("PowerPoint selected. Needs server + LibreOffice conversion.");
        activatePresentationMode();
        return;
    }

    updateStatus("Unsupported file type.");
}


/* Hide upload card after choosing a valid presentation */
function activatePresentationMode() {
    presentationPage.classList.remove("is-waiting-upload");
    presentationPage.classList.add("is-presentation-active");

    clearActiveTool();

    teacherControls.classList.remove("is-visible");
    hideToolOptionsPanel();
    hideAllToolOptionsGroups();
}


/* Opens the same presentation file picker again */
function openPresentationPicker() {
    presentationFileInput.click();
}


/* ==========================================================
   6. Teacher Controls Visibility
   Purpose:
   Show teacher toolbar only when mouse is in lower third.
========================================================== */

function handlePageMouseMove(event) {
    updateTeacherControlsVisibility(event);
    updateLaserPointerPosition(event);
}


/* Checks mouse Y position and opens/closes toolbar.
   Toolbar is allowed only after presentation upload.
   After choosing a tool, toolbar stays hidden until mouse leaves bottom zone.
*/
function updateTeacherControlsVisibility(event) {
    const isPresentationActive =
        presentationPage.classList.contains("is-presentation-active");

    if (!isPresentationActive) {
        teacherControls.classList.remove("is-visible");
        hideToolOptionsPanel();
        return;
    }

    const bottomThirdStart = window.innerHeight * 0.66;
    const isMouseInBottomZone = event.clientY >= bottomThirdStart;

    if (!isMouseInBottomZone) {
        shouldKeepToolbarHiddenUntilMouseLeavesBottom = false;

        teacherControls.classList.remove("is-visible");
        hideToolOptionsPanel();
        return;
    }

    if (shouldKeepToolbarHiddenUntilMouseLeavesBottom) {
        teacherControls.classList.remove("is-visible");
        hideToolOptionsPanel();
        return;
    }

    teacherControls.classList.add("is-visible");
}


/* ==========================================================
   7. Tool Selection
   Purpose:
   Set active tool and update visible UI states.
========================================================== */

function setActiveTool(toolName) {
    if (!toolName) {
        clearActiveTool();
        return;
    }

    presentationState.activeTool = toolName;

    updateActiveToolButton(toolName);
    updateToolOptionsPanel(toolName);
    updateLaserVisibility(toolName);
    handleSpecialToolAction(toolName);

    updateStatus(`Active tool: ${toolName}`);

    startTeacherControlsAutoHide();
}


/* Adds is-active only to the selected tool button */
function updateActiveToolButton(toolName) {
    toolButtons.forEach(function (button) {
        button.classList.remove("is-active");

        if (button.dataset.tool === toolName) {
            button.classList.add("is-active");
        }
    });
}


/* Handles tools that need immediate action */
function handleSpecialToolAction(toolName) {
    if (toolName === "image") {
        imageUploadInput.click();
    }

    if (toolName === "switch") {
        openPresentationPicker();
        clearActiveTool();
    }
}

/* Clears active tool state.
   Used on first page load and when we want no default tool.
*/
function clearActiveTool() {
    presentationState.activeTool = null;

    toolButtons.forEach(function (button) {
        button.classList.remove("is-active");
    });

    hideToolOptionsPanel();
    hideAllToolOptionsGroups();
    laserPointer.classList.remove("is-visible");
}


/* ==========================================================
   8. Tool Options Panel
   Purpose:
   Show options only for tools that have options.
   Pen    -> color + size
   Eraser -> size
   Laser  -> color
========================================================== */

function updateToolOptionsPanel(toolName) {
    const matchingGroup = findOptionsGroupByTool(toolName);

    hideAllToolOptionsGroups();

    if (!matchingGroup) {
        hideToolOptionsPanel();
        return;
    }

    showToolOptionsPanel();
    matchingGroup.classList.add("is-visible");
}


/* Finds the options group with data-options-for="toolName" */
function findOptionsGroupByTool(toolName) {
    return document.querySelector(`[data-options-for="${toolName}"]`);
}


/* Hides the whole options panel */
function hideToolOptionsPanel() {
    toolOptionsPanel.classList.remove("is-visible");
}


/* Shows the whole options panel and starts auto-hide timer */
function showToolOptionsPanel() {
    toolOptionsPanel.classList.add("is-visible");
    startToolOptionsAutoHide();
}

/* Starts a short timer that hides advanced tool options */
function startToolOptionsAutoHide() {
    clearTimeout(toolOptionsHideTimer);

    toolOptionsHideTimer = setTimeout(function () {
        hideToolOptionsPanel();
        hideAllToolOptionsGroups();
    }, 3000);
}

/* Starts a timer that hides only the toolbar and options.
   Important:
   We DO NOT clear the active tool here,
   because Laser should keep working after the toolbar hides.
*/
function startTeacherControlsAutoHide() {
    clearTimeout(teacherControlsHideTimer);

    teacherControlsHideTimer = setTimeout(function () {
        teacherControls.classList.remove("is-visible");

        hideToolOptionsPanel();
        hideAllToolOptionsGroups();

        shouldKeepToolbarHiddenUntilMouseLeavesBottom = true;
    }, 3000);
}

/* Hides all internal options groups */
function hideAllToolOptionsGroups() {
    toolOptionsGroups.forEach(function (group) {
        group.classList.remove("is-visible");
    });
}


/* ==========================================================
   9. Tool Inputs
   Purpose:
   Save option values from the floating tool options panel.
========================================================== */

function updatePenColor() {
    presentationState.penColor = penColorInput.value;

    updateStatus(`Pen color: ${presentationState.penColor}`);
}


function updatePenSize() {
    presentationState.penSize = Number(penSizeInput.value);

    updateStatus(`Pen size: ${presentationState.penSize}`);
}


function updateEraserSize() {
    presentationState.eraserSize = Number(eraserSizeInput.value);

    updateStatus(`Eraser size: ${presentationState.eraserSize}`);
}


function updateLaserColor() {
    presentationState.laserColor = laserColorInput.value;

    laserPointer.style.backgroundColor = presentationState.laserColor;
    laserPointer.style.boxShadow = `0 0 18px ${presentationState.laserColor}`;

    updateStatus(`Laser color: ${presentationState.laserColor}`);
}


/* ==========================================================
   10. Image Tool
   Purpose:
   Basic image upload mockup.
   For now, adds the selected image to the slide center.
========================================================== */

function handleImageUpload(event) {
    const file = event.target.files[0];

    if (!file) {
        updateStatus("No image selected.");
        return;
    }

    const imageUrl = URL.createObjectURL(file);

    addImageToSlide(imageUrl);

    updateStatus("Image added to slide.");
}


/* Creates an image element and places it on the slide */
function addImageToSlide(imageUrl) {
    const imageElement = document.createElement("img");

    imageElement.className = "slide-image-object";
    imageElement.src = imageUrl;
    imageElement.alt = "Uploaded annotation image";

    imageElement.style.left = "50%";
    imageElement.style.top = "50%";
    imageElement.style.transform = "translate(-50%, -50%)";

    domLayer.appendChild(imageElement);
}


/* ==========================================================
   11. Laser Pointer
   Purpose:
   Show laser only when Laser tool is active.
========================================================== */

function updateLaserVisibility(toolName) {
    if (toolName === "laser") {
        laserPointer.classList.add("is-visible");
        return;
    }

    laserPointer.classList.remove("is-visible");
}


/* Moves the laser dot with the mouse */
function updateLaserPointerPosition(event) {
    if (presentationState.activeTool !== "laser") {
        return;
    }

    laserPointer.style.left = `${event.clientX}px`;
    laserPointer.style.top = `${event.clientY}px`;
}


/* ==========================================================
   12. Stop Presentation
   Purpose:
   Display the final "Presentation Ended" screen.
========================================================== */

function stopPresentation() {
    endScreen.classList.add("is-visible");

    updateStatus("Presentation stopped.");
}

/* ==========================================================
   13. PDF Page Navigation
   Purpose:
   Move between PDF pages and update page indicator.
========================================================== */

function handlePdfPageChange(pageInfo) {
    if (!pageInfo) {
        return;
    }

    if (pdfPageIndicator) {
        pdfPageIndicator.textContent =
            `${pageInfo.currentPage} / ${pageInfo.totalPages}`;
    }

    presentationData.currentPage = pageInfo.currentPage;
    presentationData.totalPages = pageInfo.totalPages;
    presentationData.fileName = pageInfo.fileName;

    ensurePageData(pageInfo.currentPage);

    renderQuestionsForCurrentPage();
    renderQaDrawer();

    console.log("PDF page changed:", pageInfo);
    console.log("Current presentation JSON:", presentationData);
}


async function goToNextPdfPage() {
    await pdfViewerManager.goToNextPage();
}


async function goToPreviousPdfPage() {
    await pdfViewerManager.goToPreviousPage();
}

/* ==========================================================
   13. Helpers
   Purpose:
   Small reusable utility functions.
========================================================== */

/* Updates the upload/status text */
function updateStatus(message) {
    presentationStatusText.textContent = message;
}

/* ==========================================================
   Active Page Helper
   Purpose:
   Get the current PDF page from the PDF viewer.
   This prevents stale page state when saving annotations/questions.
========================================================== */

function getActivePageNumber() {
    if (pdfViewerManager && pdfViewerManager.hasPdf()) {
        return pdfViewerManager.getCurrentPage();
    }

    return presentationData.currentPage || 1;
}

/* ==========================================================
   14. Presentation Data JSON Helpers
   Purpose:
   Manage page-based data for annotations, objects and questions.
========================================================== */

function ensurePageData(pageNumber) {
    if (!presentationData.pages[pageNumber]) {
        presentationData.pages[pageNumber] = {
            annotations: [],
            objects: [],
            questions: []
        };
    }

    return presentationData.pages[pageNumber];
}


function createId(prefix) {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}


function saveQuestionPoint(relativePoint, pageNumber, questionText) {
    const pageData = ensurePageData(pageNumber);

    const presentationId = createPresentationId(presentationData.fileName);

    const savedQuestion = createAndSaveQuestion({
        presentationId: presentationId,
        fileName: presentationData.fileName,

        page: pageNumber,

        x: relativePoint.x,
        y: relativePoint.y,

        text: questionText,
        status: "open",

        color: presentationState.questionMarkerColor,

        studentName: "Anonymous",
        isAnonymous: true
    });

    pageData.questions.push(savedQuestion);

    // renderQuestionMarker(savedQuestion);
    if (presentationState.questionMarkersVisible) {
        renderQuestionMarker(savedQuestion);
    }

    renderQaDrawer();

    console.log("Saved question on page:", pageNumber);
    console.log("Saved question:", savedQuestion);
    console.log("Presentation runtime JSON:", presentationData);
    console.log(
        "Question localStorage JSON:",
        dlsQuestionDebug.loadQuestionStore()
    );
}

/* Shift + Click = Save Q Point - create dot obj */
/* JSON Q :
{
    id: "q_...",
    type: "question-point",
    page: 3,
    x: 0.42,
    y: 0.31,
    text: "",
    status: "open",
    createdAt: "..."
}
*/
function createQuestionPoint(relativePoint, pageNumber) {
    return {
        id: createId("q"),
        type: "question-point",

        page: pageNumber,

        x: relativePoint.x,
        y: relativePoint.y,

        text: "",
        status: "open",

        createdAt: new Date().toISOString()
    };
}

/* ==========================================================
   15. Question Markers
   Purpose:
   Render saved question markers on the DOM layer.
========================================================== */
/* Clear Question Markers */
function clearQuestionMarkers() {
    const markers = domLayer.querySelectorAll(".question-marker");

    markers.forEach(function (marker) {
        marker.remove();
    });
}

/* Display Question Marker (button) */
function renderQuestionMarker(question) {
    const marker = document.createElement("button");

    marker.className = "question-marker";
    marker.type = "button";

    marker.dataset.questionId = question.id;
    marker.title = question.text || "Student question";

    /* Actual Marker */
    marker.textContent = "?";

    marker.style.left = `${question.x * 100}%`;
    marker.style.top = `${question.y * 100}%`;
    marker.style.backgroundColor = question.color || "#ff3b6b";

    marker.addEventListener("click", function () {
        console.log("Question marker clicked:", question);
        updateStatus(`Question: ${question.text || "No text yet"}`);
    });

    domLayer.appendChild(marker);
}

function renderQuestionsForCurrentPage() {
    clearQuestionMarkers();

    if (!presentationState.questionMarkersVisible) {
        return;
    }

    const presentationId = createPresentationId(presentationData.fileName);
    const pageNumber = getActivePageNumber();

    const questions = getQuestionsForPage(presentationId, pageNumber);

    clearQuestionMarkers();

    questions.forEach(function (question) {
        renderQuestionMarker(question);
    });

}

/* Helper - Toggle Func for Visibility of Markers on PDF current page */
function toggleQuestionMarkerVisibility() {
    presentationState.questionMarkersVisible = !presentationState.questionMarkersVisible;

    renderQuestionsForCurrentPage();

    if (presentationState.questionMarkersVisible) {
        updateStatus("Question Markers Are Visible 👁️ ");
    }
    else {
        updateStatus("Question Markers Are Hidden 🥷🏻 ");
    }
}

/* ==========================================================
   QUESTION COMPOSE POPUP
   Purpose:
   Open a small input popup before saving a question.
========================================================== */

/*
   Opens the question popup near the mouse click.

   relativePoint:
   - x/y inside the PDF page, saved as 0..1

   pageNumber:
   - current PDF page number

   event:
   - browser pointer event, used for screen position
*/
function openQuestionComposePopup(relativePoint, pageNumber, event) {
    pendingQuestionDraft = {
        page: pageNumber,
        x: relativePoint.x,
        y: relativePoint.y,
        screenX: event.clientX,
        screenY: event.clientY

    };

    questionComposeInput.value = "";
    questionComposePopup.style.left = `${event.clientX + 14}px`;
    questionComposePopup.style.top = `${event.clientY + 14}px`;

    questionComposePopup.classList.add("is-visible");
    questionComposePopup.setAttribute("aria-hidden", "false");

    questionComposeInput.focus();
}

/*
   Closes the question popup and clears the draft.
*/
function closeQuestionComposePopup() {
    pendingQuestionDraft = null;

    questionComposePopup.classList.remove("is-visible");
    questionComposePopup.setAttribute("aria-hidden", "true");

    questionComposeInput.value = "";
}

/*
Saves padding Question after User typed Text
*/
function savePendingQuestionFromPopup() {
    if (!pendingQuestionDraft) {
        return;
    }

    const questionText = questionComposeInput.value.trim();

    if (questionText === "") {
        updateStatus(" Question text cannot be EMPTY! ");
        console.log(" invalid input -Empty Question String! ");
        questionComposeInput.focus();
        return;
    }

    const relativePoint = {
        x: pendingQuestionDraft.x,
        y: pendingQuestionDraft.y
    };

    const pageNumber = pendingQuestionDraft.page;
    saveQuestionPoint(relativePoint, pageNumber, questionText);
    closeQuestionComposePopup();
    updateStatus(" Question Saved 💾 ");
}

/* ==========================================================
   Q&A DRAWER RENDERING
   Purpose:
   Render saved questions in the side drawer.
========================================================== */

function getActivePresentationId() {
    return createPresentationId(presentationData.fileName);
}


function getQuestionsForDrawer() {
    const presentationId = getActivePresentationId();

    if (qaDrawerFilter === "currentPage") {
        return getQuestionsForPage(
            presentationId,
            getActivePageNumber()
        );
    }

    return getQuestionsForPresentation(presentationId);
}


function clearQaDrawer() {
    if (!qaDrawerList) {
        return;
    }

    qaDrawerList.innerHTML = "";
}


function renderQaDrawerEmptyState() {
    const emptyMessage = document.createElement("div");

    emptyMessage.className = "qa-drawer__empty";
    emptyMessage.textContent = "No questions yet.";

    qaDrawerList.appendChild(emptyMessage);
}


function renderQaQuestionCard(question) {
    const card = document.createElement("button");

    card.className = "qa-question-card";
    card.type = "button";

    card.dataset.questionId = question.id;

    card.innerHTML = `
        <div class="qa-question-card__meta">
            <span>Page ${question.page}</span>
            <span>${question.isAnonymous ? "Anonymous" : question.studentName}</span>
        </div>

        <p class="qa-question-card__text">
            ${question.text || "No question text"}
        </p>

        <div class="qa-question-card__status">
            ${question.status || "open"}
        </div>
    `;

    card.addEventListener("click", function () {
        goToQuestion(question.id);
    });

    qaDrawerList.appendChild(card);
}


function renderQaDrawer() {
    if (!qaDrawerList) {
        return;
    }

    clearQaDrawer();

    const questions = getQuestionsForDrawer();

    if (qaDrawerCount) {
        qaDrawerCount.textContent = questions.length;
    }

    if (questions.length === 0) {
        renderQaDrawerEmptyState();
        return;
    }

    questions
        .slice()
        .sort(function (a, b) {
            return a.page - b.page || a.createdAt.localeCompare(b.createdAt);
        })
        .forEach(function (question) {
            renderQaQuestionCard(question);
        });
}


function setQaDrawerFilter(nextFilter) {
    qaDrawerFilter = nextFilter;

    if (qaShowAllButton) {
        qaShowAllButton.classList.toggle(
            "is-active",
            qaDrawerFilter === "all"
        );
    }

    if (qaShowCurrentPageButton) {
        qaShowCurrentPageButton.classList.toggle(
            "is-active",
            qaDrawerFilter === "currentPage"
        );
    }

    renderQaDrawer();
}

/* ==========================================================
   QUESTION NAVIGATION
   Purpose:
   Jump to the page of a selected question.
========================================================== */

function findQuestionById(questionId) {
    const questions = getQuestionsForPresentation(getActivePresentationId());

    return questions.find(function (question) {
        return question.id === questionId;
    });
}


async function goToQuestion(questionId) {
    const question = findQuestionById(questionId);

    if (!question) {
        updateStatus("Question not found.");
        return;
    }

    await pdfViewerManager.goToPage(question.page);

    presentationState.questionMarkersVisible = true;

    renderQuestionsForCurrentPage();
    renderQaDrawer();

    highlightQuestionMarker(question.id);

    updateStatus(`Moved to question on page ${question.page}.`);
}


function highlightQuestionMarker(questionId) {
    const marker = domLayer.querySelector(
        `[data-question-id="${questionId}"]`
    );

    if (!marker) {
        return;
    }

    marker.classList.add("question-marker--highlighted");

    setTimeout(function () {
        marker.classList.remove("question-marker--highlighted");
    }, 2500);
}

/* ==========================================================
   Relative Pointer Position Handler
   Purpose:
   Convert click position into relative PDF page position.
   Shift + Click saves a Q point on the current PDF page.
========================================================== */
function handleAnnotationCanvasPointerDown(event) {
    if (!pdfViewerManager.hasPdf()) {
        return;
    }

    const pageNumber = getActivePageNumber();
    const relativePoint = getRelativePointFromPointerEvent(event);

    console.log("Relative PDF click:", {
        page: pageNumber,
        x: relativePoint.x,
        y: relativePoint.y,
        raw: relativePoint.raw
    });

    if (event.shiftKey) {
        openQuestionComposePopup(relativePoint, pageNumber, event);

        updateStatus(
            `Q point saved on page ${pageNumber}: x=${relativePoint.x.toFixed(3)}, y=${relativePoint.y.toFixed(3)}`
        );

        return;
    }

    updateStatus(
        `Click on page ${pageNumber}: x=${relativePoint.x.toFixed(3)}, y=${relativePoint.y.toFixed(3)}`
    );
}

/* JSON will save x/y + raw = debugging console data */
function getRelativePointFromPointerEvent(event) {
    const pageRect = pdfViewerManager.getPageLayerRect();

    const localX = event.clientX - pageRect.left;
    const localY = event.clientY - pageRect.top;

    const relativeX = localX / pageRect.width;
    const relativeY = localY / pageRect.height;

    return {
        x: clamp(relativeX, 0, 1),
        y: clamp(relativeY, 0, 1),

        raw: {
            clientX: event.clientX,
            clientY: event.clientY,
            localX: localX,
            localY: localY,
            width: pageRect.width,
            height: pageRect.height
        }
    };
}


function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}