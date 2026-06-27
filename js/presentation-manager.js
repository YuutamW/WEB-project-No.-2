// Dor Mandel :       ID: 315313825
// Yotam Weintraub:   ID: 321610859
// Load PDF.js
/* /* ==========================================================
   DLS PRESENTATION MANAGER
   File: frontEnd/js/presentation-manager.js
   ----------------------------------------------------------
   PURPOSE
   • Load a PDF / PPTX (PDF only for now) and render it with
     `pdf-viewer.js`.
   • Run a live-session (teacher) or join an existing one
     (student) via the DLS_SOCKET and DLS_API helpers.
   • Provide the teacher-toolbar (pen, eraser, laser, image,
     settings, switch-presentation) with auto-hide logic.
   • Store per-page annotation / question data in `presentationData`.
   • Sync new questions in real-time (socket “questionCreated”).
   • Render question markers, the Q&A drawer and the
     summary-overlay.
   ----------------------------------------------------------
   HIGH-LEVEL SECTION MAP (keep in sync with the code)
   1.  DOM REFERENCES – all `document.getElementById(...)` &
       `querySelectorAll` calls.
   2.  APP STATE – `presentationState` & `presentationData`
       (page-wise JSON model).
   2.1 Presentation-data JSON helpers (`ensurePageData`,
       `getAllPresentationQuestions`, …).
   3.  INIT – `initPresentationPage()` + `initializeLiveSession()`.
   4.  EVENT CONNECTIONS – `connectEvents()` wiring for
       uploads, toolbar, navigation, socket updates, etc.
   5.  FILE-UPLOAD HANDLING – `handlePresentationFilePicked`,
       `startLectureFromPendingFile`, `activatePresentationMode`,
       etc.
   6.  TEACHER-CONTROLS VISIBILITY – mouse-zone logic.
   7.  TOOL SELECTION – `setActiveTool`, button highlights,
       special-tool actions (settings / image / switch).
   8.  TOOL-OPTIONS PANEL – show/hide groups, auto-hide timers.
   9.  TOOL INPUTS – pen, eraser, laser colour/size handling.
   10. IMAGE TOOL – upload → DOM-layer insertion.
   11. LASER POINTER – visibility + mouse tracking.
   12. STOP PRESENTATION – opens the summary overlay.
   13. PDF PAGE NAVIGATION – next/prev + page-change UI.
   14. LIVE-SESSION HELPERS – create/join session, QR code,
       participants list, copy-link, refresh participants.
   15. QUESTION MARKER FLOW – pointer-down → compose popup →
       save → render (local + socket sync).
   16. Q&A DRAWER – filter (all / current page), list rendering.
   17. SUMMARY OVERLAY – stats, hottest-page, grouped questions.
   18. UTILITIES – `updateStatus`, `clamp`, relative pointer
       conversion, etc.
   ==========================================================
*/
/* impord PDF API Viewer */
import { createPdfViewerManager } from "./pdf-viewer.js";
/* Question manager on DOM layer */
import {
    createAndSaveQuestion,
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

const presentationSessionTitleInput = document.getElementById("presentationSessionTitleInput");
const startLectureButton = document.getElementById("startLectureButton");

/* Live session elements */
const sessionRoomBadge = document.getElementById("sessionRoomBadge");
const sessionRoomCodeText = document.getElementById("sessionRoomCodeText");

const sessionInfoOverlay = document.getElementById("sessionInfoOverlay");
const closeSessionInfoOverlayButton = document.getElementById("closeSessionInfoOverlayButton");
const sessionInfoTitle = document.getElementById("sessionInfoTitle");
const sessionInfoCode = document.getElementById("sessionInfoCode");
const sessionQrCodeBox = document.getElementById("sessionQrCodeBox");
const sessionJoinLinkInput = document.getElementById("sessionJoinLinkInput");
const copySessionJoinLinkButton = document.getElementById("copySessionJoinLinkButton");
const refreshSessionParticipantsButton = document.getElementById("refreshSessionParticipantsButton");
const sessionQuestionsVisibilityButton = document.getElementById("sessionQuestionsVisibilityButton");
const sessionParticipantsCount = document.getElementById("sessionParticipantsCount");
const sessionParticipantsList = document.getElementById("sessionParticipantsList");

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

/* Summary Overlay */
const summaryOverlay = document.getElementById("summaryOverlay");
const closeSummaryOverlayButton = document.getElementById("closeSummaryOverlayButton");
const summaryOverlayBackButton = document.getElementById("summaryOverlayBackButton");
const summaryOverlayRefreshButton = document.getElementById("summaryOverlayRefreshButton");
const overlayTotalQuestions = document.getElementById("overlayTotalQuestions");
const overlayHottestPage = document.getElementById("overlayHottestPage");
const overlayQuestionsList = document.getElementById("overlayQuestionsList");
const summaryOverlayEndSessionButton = document.getElementById("summaryOverlayEndSessionButton");


/* ==========================================================
   2. App State
   Purpose:
   Keep the current page/tool state in one organized object.
========================================================== */

const presentationState = {
    currentRole: "lecturer",
    currentFile: null,
    activeTool: null,

    penColor: "#ff7a90",
    penSize: 4,

    eraserSize: 4,

    laserColor: "#ff3b3b",

    questionMarkersVisible: false,
    questionMarkerColor: "#ff3b6b",

    pendingFile: null,
    sessionId: null, //  Set by the server
    sessionTitle: "",
    sessionJoinUrl: ""

};

const STUDENT_TOOLBAR_FEATURES = {
    annotation: false,
    text: false,
    eraser: false,

    question: true,
    layers: true,
    share: true,
    exit: true,

    followLecturer: false
};
const LECTURER_TOOLBAR_FEATURES = {
    annotation: true,
    text: true,
    eraser: true,
}

/* --Added Helper Vars-- */

let toolOptionsHideTimer = null;

let teacherControlsHideTimer = null;

let shouldKeepToolbarHiddenUntilMouseLeavesBottom = false;

let pendingQuestionDraft = null;

let isSavingQuestion = false;

let qaDrawerFilter = "all";

function applyPresentationRole() {
    const role = presentationState.currentRole || "lecturer";

    if (teacherControls) {
        teacherControls.style.display = "";
        teacherControls.dataset.role = role;
    }

    const roleButtons = document.querySelectorAll("[data-control-role]");

    roleButtons.forEach(function (button) {
        const buttonRole = button.dataset.controlRole;

        if (buttonRole !== role) {
            button.hidden = true;
            return;
        }

        if (role === "student") {
            const featureName = button.dataset.studentFeature;

            if (
                featureName &&
                STUDENT_TOOLBAR_FEATURES[featureName] === false
            ) {
                button.hidden = true;
                return;
            }
        }

        button.hidden = false;
    });
}

function setPresentationRole(role) {
    presentationState.currentRole = role;
    applyPresentationRole();
}

function getSessionId() { return presentationState.sessionId; }
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
   Starts the presentation page logic after the file is loaded.
========================================================== */
async function initPresentationPage() {
    connectEvents();
    clearActiveTool();

    const urlParams = new URLSearchParams(window.location.search);
    const sessionCode = urlParams.get("sessioncode") || urlParams.get("sessionCode");

    if (sessionCode) {
        //  JOIN an existing session
        presentationState.sessionId = sessionCode;
        updateStatus("Joining live session...");
        await initializeLiveSession(sessionCode);
    } else {
        // --- CREATING A NEW SESSION (Default Lecturer Flow) ---
        updateStatus("Presentation page ready. Waiting for upload.");
        setPresentationRole("lecturer");
        updateStatus("Presentation page ready. Waiting for upload.");
    }

    // Leave Session:
    const studentExitSessionButton = document.querySelector(
        "[data-session-action='leave-session']"
    );

    if (studentExitSessionButton) {
        studentExitSessionButton.addEventListener("click", leaveCurrentSession);
    }
}

/*==========================================================
    3.5 init helper
    Purpose: get session metadata, adjust ui based on ROLE , load the pdf into the viewer and join the socket room
*/
async function initializeLiveSession(sessionCode) {
    try {
        const currentUser = getCurrentDlsUser();
        const currentUserId = currentUser?.id || currentUser?._id;

        // 1. Get session metadata
        const sessionInfo = await window.DLS_API.getSessionByCode(sessionCode);
        presentationState.session = sessionInfo;

        // checks to see if the session's owner id matches the user id, if not then it's a student
        const isLecturer = sessionInfo.ownerId === currentUserId;

        // 2. Adjust UI based on Role
        if (!isLecturer) {
            setPresentationRole("student");
            // Student Setup: Hide teacher controls permanently
            // const teacherControls = document.getElementById("teacherControls");
            // if (teacherControls) teacherControls.style.display = "none";
            const navControls = document.getElementById("pdfNavigationControls");
            if (navControls) navControls.style.display = "flex";
            updateStatus("Downloading lecture materials...");
        } else {
            updateStatus("Reconnecting to your session...");
            renderSessionInfo(sessionInfo);
            updateStatus("Reconnecting to your session...");
        }

        // 3. Download the PDF Blob from the backend
        const pdfBlob = await window.DLS_API.fetchSessionPdfAsBlob(sessionCode);

        // 4. Convert Blob to a File-like object so pdfViewerManager accepts it
        const pdfFile = new File([pdfBlob], sessionInfo.title + ".pdf", { type: "application/pdf" });
        presentationState.currentFile = pdfFile;

        // 5. Hide the upload panel and show the canvas
        activatePresentationMode();

        // 6. Load the PDF into the viewer
        await pdfViewerManager.loadPdfFile(pdfFile);

        // 7. Join the Socket.IO room for real-time updates
        if (window.DLS_SOCKET) {
            window.DLS_SOCKET.joinPresentation(`session_${sessionCode}`);
            setupLiveSocketListeners();
        }
        updateStatus(`Connected to room: ${sessionCode}`);

    } catch (error) {
        console.error("Failed to join live session:", error);
        updateStatus("Error joining session. Please check the code and try again.");
    }
}


/*==========================================================
    3.75 setup live socket listener
    Purpose: 
*/
function setupLiveSocketListeners() {
    if (!window.DLS_SOCKET) {
        console.warn("Socket module not found.");
        return;
    }

    // Listen for new questions arriving from the server
    window.DLS_SOCKET.onQuestionCreated(function (newQuestion) {
        // 1. Inject the incoming question into our local page data
        const pageData = ensurePageData(newQuestion.page);

        // Prevent duplicates just in case the sender also receives their own broadcast
        const exists = pageData.questions.some(q => q.id === newQuestion.id);
        if (!exists) {
            pageData.questions.push(newQuestion);
        }

        // 2. Check if the user is currently looking at the page where the question was dropped
        if (getActivePageNumber() === newQuestion.page) {
            // If yes, re-render the dots so the new one pops up instantly!
            renderQuestionsForCurrentPage();
        }

        // 3. Always update the Q&A side drawer count and list
        renderQaDrawer();

        // Optional: Show a subtle toast/status update
        updateStatus(`New question added on page ${newQuestion.page}`);
    });

    // add listeners for updates/deletes here later!
    // window.DLS_SOCKET.onQuestionDeleted(function(deletedQuestionId) { ... });
}

initPresentationPage();
/* ==========================================================
   4. Event Connections
   Purpose:
   Connect HTML elements to JavaScript actions.
========================================================== */

function connectEvents() {
    /* File upload */
    presentationFileInput.addEventListener("change", handlePresentationFilePicked);

    if (startLectureButton) {
        startLectureButton.addEventListener("click", startLectureFromPendingFile);
    }

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

    /* Listener for Participants Number Update */
    if (
        window.DLS_SOCKET &&
        typeof window.DLS_SOCKET.onSessionParticipantsUpdated === "function"
    ) {
        window.DLS_SOCKET.onSessionParticipantsUpdated(function (updatedSession) {
            if (!updatedSession) {
                return;
            }

            const currentCode = presentationState.session?.code;
            const updatedCode = updatedSession.code || updatedSession.sessionCode;

            if (currentCode && updatedCode && currentCode !== updatedCode) {
                return;
            }

            presentationState.session = {
                ...presentationState.session,
                ...updatedSession
            };

            saveCurrentSessionToLocalStorage(presentationState.session);

            renderSessionParticipants(presentationState.session);

            updateStatus(
                `Participants updated: ${presentationState.session.participantsCount ||
                presentationState.session.participants?.length ||
                0
                }`
            );
        });
    }

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

    /* Summary Events */
    if (closeSummaryOverlayButton) {
        closeSummaryOverlayButton.addEventListener("click", closeSummaryOverlay);
    }

    if (summaryOverlayBackButton) {
        summaryOverlayBackButton.addEventListener("click", closeSummaryOverlay);
    }

    if (summaryOverlayRefreshButton) {
        summaryOverlayRefreshButton.addEventListener("click", renderSummaryOverlay);
    }

    if (summaryOverlayEndSessionButton) {
        summaryOverlayEndSessionButton.addEventListener("click", endLecturerSessionFromSummary);
    }

    /* Live session overlay */
    if (closeSessionInfoOverlayButton) {
        closeSessionInfoOverlayButton.addEventListener("click", closeSessionInfoOverlay);
    }

    if (sessionRoomBadge) {
        sessionRoomBadge.addEventListener("click", openSessionInfoOverlay);
    }

    if (copySessionJoinLinkButton) {
        copySessionJoinLinkButton.addEventListener("click", copySessionJoinLink);
    }

    if (refreshSessionParticipantsButton) {
        refreshSessionParticipantsButton.addEventListener("click", refreshSessionParticipants);
    }

    if (sessionQuestionsVisibilityButton) {
        sessionQuestionsVisibilityButton.addEventListener("click", toggleQuestionMarkerVisibility);
    }
}


/* ==========================================================
   5. File Upload Handling
   Purpose:
   Detect selected file type and update the mockup state.
   await = async func - not to stuck the flow
========================================================== */
// OLD
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

function handlePresentationFilePicked(event) {
    const file = event.target.files[0];

    if (!file) {
        presentationState.pendingFile = null;

        if (startLectureButton) {
            startLectureButton.disabled = true;
        }

        updateStatus("No file selected.");
        return;
    }

    const fileName = file.name.toLowerCase();

    if (
        !fileName.endsWith(".pdf") &&
        !fileName.endsWith(".ppt") &&
        !fileName.endsWith(".pptx")
    ) {
        presentationState.pendingFile = null;

        if (startLectureButton) {
            startLectureButton.disabled = true;
        }

        updateStatus("Unsupported file type.");
        return;
    }

    presentationState.pendingFile = file;

    if (startLectureButton) {
        startLectureButton.disabled = false;
    }

    updateStatus(`File ready: ${file.name}. Press Start Lecture.`);
}

async function startLectureFromPendingFile() {
    const file = presentationState.pendingFile;

    if (!file) {
        updateStatus("Choose a PDF first.");
        return;
    }

    const sessionTitle = getSessionTitleForFile(file);

    presentationState.currentFile = file;
    presentationState.sessionTitle = sessionTitle;

    if (presentationSessionTitleInput && !presentationSessionTitleInput.value.trim()) {
        presentationSessionTitleInput.value = sessionTitle;
    }

    if (startLectureButton) {
        startLectureButton.disabled = true;
    }

    updateStatus("Starting lecture... [creating live session]");

    try {
        const session = await createLiveSessionForPresentation(file, sessionTitle);

        presentationState.session = session;
        presentationState.sessionJoinUrl = buildStudentJoinUrl(session.code);
        presentationState.sessionId = session.code;
        presentationState.sessionTitle = sessionTitle;

        saveCurrentSessionToLocalStorage(session);
        renderSessionInfo(session);
        openSessionInfoOverlay();

        // in create session - the lecturer will "join" participants number
        if (window.DLS_SOCKET) {
            window.DLS_SOCKET.joinPresentation(`session_${session.code}`);
            setupLiveSocketListeners();
        }
    } catch (error) {
        console.error("Session creation failed:", error);
        updateStatus("Session creation failed. Starting presentation without room.");
    }

    updateStatus("Starting lecture...");

    await handlePresentationFileUpload({
        target: {
            files: [file]
        }
    });
}

function buildDefaultSessionTitle(file) {
    const fileBaseName = file.name.replace(/\.[^/.]+$/, "");

    const now = new Date();

    const dateText = now.toLocaleDateString("he-IL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });

    const timeText = now.toLocaleTimeString("he-IL", {
        hour: "2-digit",
        minute: "2-digit"
    });

    return `${fileBaseName} · ${dateText} ${timeText}`;
}

function getSessionTitleForFile(file) {
    const typedTitle = presentationSessionTitleInput
        ? presentationSessionTitleInput.value.trim()
        : "";

    if (typedTitle) {
        return typedTitle;
    }

    return buildDefaultSessionTitle(file);
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
    if (toolName === "question") {
        updateStatus("לחץ על מקום ב־PDF כדי להוסיף שאלה.");
        return;
    }

    if (toolName === "layers") {
        updateStatus("Layers / Cast panel will be added here.");
        clearActiveTool();
        return;
    }

    if (toolName === "share") {
        updateStatus("Share / Export PDF will be added here.");
        clearActiveTool();
        return;
    }

    if (toolName === "follow-lecturer") {
        updateStatus("Follow Lecturer mode will be added later.");
        clearActiveTool();
        return;
    }
    if (toolName === "settings") {
        openSessionInfoOverlay();
        clearActiveTool();
        return;
    }

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
    //openSummaryPage();
    openSummaryOverlay();
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

/* ==========================================================
   LIVE SESSION HELPERS
========================================================== */

async function createLiveSessionForPresentation(file, title) {
    if (!window.DLS_API || typeof window.DLS_API.createSession !== "function") {
        throw new Error("DLS_API.createSession is not available.");
    }

    // Pass the actual File object and title directly to the updated API method
    const session = await window.DLS_API.createSession(file, title);

    const code = session.code;
    if (!code) {
        throw new Error("Backend did not return a session code.");
    }
    return {
        ...session,
        code: code,
        title: session.title || title,
        fileName: file.name,
        ownerId: session.ownerId,
        sessionId: code
    };
}

function buildStudentJoinUrl(code) {
    const baseUrl =
        window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1"
            ? window.location.origin + "/"
            : "https://yuutamw.github.io/WEB-project-No.-2/";

    return (
        baseUrl +
        "student-dashboard.html?joinCode=" +
        encodeURIComponent(code)
    );
}

// Check if Needed ----LOCAL----
function saveCurrentSessionToLocalStorage(session) {
    const storageKey =
        window.DLS_CONFIG?.STORAGE_KEYS?.CURRENT_SESSION ||
        "dlsCurrentSession";

    localStorage.setItem(storageKey, JSON.stringify(session, null, 2));
}

function openSessionInfoOverlay() {
    if (!sessionInfoOverlay || !presentationState.session) {
        return;
    }

    renderSessionInfo(presentationState.session);

    sessionInfoOverlay.classList.add("is-visible");
    sessionInfoOverlay.setAttribute("aria-hidden", "false");
}

function closeSessionInfoOverlay() {
    if (!sessionInfoOverlay) {
        return;
    }

    sessionInfoOverlay.classList.remove("is-visible");
    sessionInfoOverlay.setAttribute("aria-hidden", "true");
}

function renderSessionInfo(session) {
    if (!session) {
        return;
    }

    const code = session.code || "------";
    const title = session.title || presentationState.sessionTitle || "Live Session";
    const joinUrl = buildStudentJoinUrl(code);

    presentationState.sessionJoinUrl = joinUrl;

    if (sessionRoomBadge) {
        sessionRoomBadge.hidden = false;
    }

    if (sessionRoomCodeText) {
        sessionRoomCodeText.textContent = code;
    }

    if (sessionInfoTitle) {
        sessionInfoTitle.textContent = title;
    }

    if (sessionInfoCode) {
        sessionInfoCode.textContent = code;
    }

    if (sessionJoinLinkInput) {
        sessionJoinLinkInput.value = joinUrl;
    }

    renderSessionQr(joinUrl);
    renderSessionParticipants(session);
}

function renderSessionQr(joinUrl) {
    if (!sessionQrCodeBox) {
        return;
    }

    sessionQrCodeBox.innerHTML = "";

    if (window.QRCode) {
        new window.QRCode(sessionQrCodeBox, {
            text: joinUrl,
            width: 180,
            height: 180,
            correctLevel: window.QRCode.CorrectLevel.M
        });

        return;
    }

    const fallbackText = document.createElement("p");
    fallbackText.textContent = joinUrl;
    sessionQrCodeBox.appendChild(fallbackText);
}

async function copySessionJoinLink() {
    const link = presentationState.sessionJoinUrl;

    if (!link) {
        updateStatus("No session link to copy.");
        return;
    }

    try {
        await navigator.clipboard.writeText(link);
        updateStatus("Session link copied.");
    } catch (error) {
        console.warn("Clipboard failed:", error);

        if (sessionJoinLinkInput) {
            sessionJoinLinkInput.select();
        }

        updateStatus("Could not copy automatically. Link selected.");
    }
}

function normalizeSessionParticipants(session) {
    const participants =
        session.participants ||
        session.connectedParticipants ||
        session.students ||
        [];

    return Array.isArray(participants) ? participants : [];
}

function renderSessionParticipants(session) {
    const participants = normalizeSessionParticipants(session);

    const participantsCount =
        Number(session.participantsCount) ||
        Number(session.participantCount) ||
        participants.length;

    if (sessionParticipantsCount) {
        sessionParticipantsCount.textContent = String(participantsCount);
    }

    if (!sessionParticipantsList) {
        return;
    }

    if (participants.length === 0) {
        if (participantsCount > 0) {
            sessionParticipantsList.innerHTML =
                `<p>${participantsCount} משתתפים מחוברים. פרטי שמות עדיין לא חוזרים מהשרת.</p>`;
            return;
        }

        sessionParticipantsList.innerHTML = "<p>אין משתתפים עדיין.</p>";
        return;
    }

    sessionParticipantsList.innerHTML = "";

    participants.forEach(function (participant) {
        const item = document.createElement("article");

        item.className = "session-participant-card";

        const name =
            participant.name ||
            participant.fullName ||
            `${participant.firstName || ""} ${participant.lastName || ""}`.trim() ||
            participant.email ||
            participant.userId ||
            "Student";

        item.innerHTML = `
            <strong>${name}</strong>
            <span>${participant.email || participant.userId || ""}</span>
        `;

        sessionParticipantsList.appendChild(item);
    });
}

async function refreshSessionParticipants() {
    const session = presentationState.session;

    if (!session || !session.code) {
        updateStatus("No active session to refresh.");
        return;
    }

    if (!window.DLS_API || typeof window.DLS_API.getSessionByCode !== "function") {
        updateStatus("Session refresh API is not available.");
        return;
    }

    try {
        const updatedSession = await window.DLS_API.getSessionByCode(session.code);

        presentationState.session = {
            ...session,
            ...updatedSession
        };

        renderSessionInfo(presentationState.session);
        updateStatus("Participants refreshed.");
    } catch (error) {
        console.error("Failed to refresh participants:", error);
        updateStatus("Could not refresh participants.");
    }
}

/* Updates the upload/status text */
function updateStatus(message) {
    presentationStatusText.textContent = message;
}

/* Exit / Leave Session Helper : */
async function leaveCurrentSession() {
    const session = presentationState.session;
    const code = session?.code || session?.sessionCode;

    try {
        if (
            code &&
            window.DLS_API &&
            typeof window.DLS_API.leaveSession === "function"
        ) {
            await window.DLS_API.leaveSession(code);
        }
    } catch (error) {
        console.warn("Leave session API failed. Continuing local exit.", error);
    }

    localStorage.removeItem(
        window.DLS_CONFIG?.STORAGE_KEYS?.CURRENT_SESSION ||
        "dlsCurrentSession"
    );

    if (
        window.DLS_SOCKET &&
        typeof window.DLS_SOCKET.disconnect === "function"
    ) {
        window.DLS_SOCKET.disconnect();
    }

    window.location.href = "student-dashboard.html";
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


// function createId(prefix) {
//     return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
// }


function saveQuestionPoint(relativePoint, pageNumber, questionText) {
    const pageData = ensurePageData(pageNumber);

    const sessionId = getSessionId(); // adapt this to the current session id in database

    const savedQuestion = createAndSaveQuestion({
        sessionId: sessionId,
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

    const sessionId = getSessionId();
    const pageNumber = getActivePageNumber();

    const questions = getQuestionsForPage(sessionId, pageNumber);

    clearQuestionMarkers();

    questions.forEach(function (question) {
        renderQuestionMarker(question);
    });

}

/* ==========================================================
   Render Summary Overlay
   Purpose:
   Build summary stats and question list from presentationData.
========================================================== */

function renderSummaryOverlay() {
    const questions = getAllPresentationQuestions();
    const hottestPage = getHottestQuestionPage(questions);

    overlayTotalQuestions.textContent = questions.length;
    overlayHottestPage.textContent = hottestPage || "-";

    renderSummaryOverlayQuestions(questions);
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

    isSavingQuestion = true;

    const draftToSave = {
        ...pendingQuestionDraft
    };

    const relativePoint = {
        x: pendingQuestionDraft.x,
        y: pendingQuestionDraft.y
    };

    //const pageNumber = pendingQuestionDraft.page;
    const pageNumber = draftToSave.page;

    // added question to the presentation data
    presentationState.questionMarkersVisible = true;

    saveQuestionPoint(relativePoint, pageNumber, questionText);
    closeQuestionComposePopup();

    // Clear the active tool
    clearActiveTool();

    updateStatus(" Question Saved 💾 ");
}

/* ==========================================================
   Get All Presentation Questions
   Purpose:
   Flatten all questions from all pages into one array.
========================================================== */

function getAllPresentationQuestions() {
    const allQuestions = [];

    Object.keys(presentationData.pages).forEach(function (pageNumber) {
        const pageData = presentationData.pages[pageNumber];
        const pageQuestions = pageData.questions || [];

        pageQuestions.forEach(function (question) {
            allQuestions.push(question);
        });
    });

    return allQuestions;
}

/* ==========================================================
   Q&A DRAWER RENDERING
   Purpose:
   Render saved questions in the side drawer.
========================================================== */


function getQuestionsForDrawer() {
    const sessionId = getSessionId();

    if (qaDrawerFilter === "currentPage") {
        return getQuestionsForPage(
            sessionId,
            getActivePageNumber()
        );
    }

    return getQuestionsForPresentation(sessionId);
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
    const questions = getQuestionsForPresentation(getSessionId());

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
   Open Summary Page
   Purpose:
   Move from the active presentation into the questions summary.
   We pass the sessionId in the URL so summary.js knows
   which questions to load from localStorage.
========================================================== */

function openSummaryPage() {
    const sessionId =
        getSessionId();

    window.location.href =
        `summary.html?presentation=${encodeURIComponent(sessionId)}`;
}

/* ==========================================================
   Open Summary Overlay
   Purpose:
   Render and show the summary above the active presentation.
========================================================== */

function openSummaryOverlay() {
    renderSummaryOverlay();

    summaryOverlay.classList.add("is-visible");
    summaryOverlay.setAttribute("aria-hidden", "false");

    hideToolOptionsPanel();
    teacherControls.classList.remove("is-visible");
}


/* ==========================================================
   Close Summary Overlay
   Purpose:
   Hide the summary and return to the presentation.
========================================================== */

function closeSummaryOverlay() {
    summaryOverlay.classList.remove("is-visible");
    summaryOverlay.setAttribute("aria-hidden", "true");
}

async function endLecturerSessionFromSummary() {
    const confirmed = window.confirm(
        "לסיים את ההרצאה ולחזור לדשבורד?\nהסטודנטים ינותקו בהמשך כאשר נחבר את צד השרת."
    );

    if (!confirmed) {
        return;
    }

    const session = presentationState.session;
    const sessionCode = session?.code || session?.sessionCode;

    try {
        if (
            sessionCode &&
            window.DLS_API &&
            typeof window.DLS_API.endSession === "function"
        ) {
            await window.DLS_API.endSession(sessionCode);
        }
    } catch (error) {
        console.warn("End session API failed. Continuing local exit.", error);
    }

    try {
        if (
            window.DLS_SOCKET &&
            typeof window.DLS_SOCKET.disconnect === "function"
        ) {
            window.DLS_SOCKET.disconnect();
        }
    } catch (error) {
        console.warn("Socket disconnect failed:", error);
    }

    localStorage.removeItem(
        window.DLS_CONFIG?.STORAGE_KEYS?.CURRENT_SESSION ||
        "dlsCurrentSession"
    );

    window.location.href = "dashboard.html";
}

/* ==========================================================
   Get Hottest Question Page
   Purpose:
   Finds the page with the highest number of questions.
========================================================== */

function getHottestQuestionPage(questions) {
    const questionsByPage = {};

    questions.forEach(function (question) {
        const page = question.page || 1;

        questionsByPage[page] = (questionsByPage[page] || 0) + 1;
    });

    let hottestPage = null;
    let highestCount = 0;

    Object.keys(questionsByPage).forEach(function (page) {
        if (questionsByPage[page] > highestCount) {
            hottestPage = page;
            highestCount = questionsByPage[page];
        }
    });

    return hottestPage;
}

/* ==========================================================
   Render Summary Overlay Questions
   Purpose:
   Group questions by page and render clickable cards.
========================================================== */

function renderSummaryOverlayQuestions(questions) {
    overlayQuestionsList.innerHTML = "";

    if (questions.length === 0) {
        overlayQuestionsList.innerHTML = `
            <article class="summary-overlay__page-group">
                <h3 class="summary-overlay__page-title">
                    No Questions Yet
                </h3>
                <p class="summary-overlay__question-meta">
                    Questions added during the lecture will appear here.
                </p>
            </article>
        `;

        return;
    }

    const groupedQuestions = groupQuestionsByPage(questions);

    Object.keys(groupedQuestions)
        .map(Number)
        .sort(function (a, b) {
            return a - b;
        })
        .forEach(function (pageNumber) {
            const pageGroup = createSummaryPageGroup(
                pageNumber,
                groupedQuestions[pageNumber]
            );

            overlayQuestionsList.appendChild(pageGroup);
        });
}

/* ==========================================================
   Group Questions By Page
   Purpose:
   Creates an object where every key is a page number.
========================================================== */

function groupQuestionsByPage(questions) {
    const groups = {};

    questions.forEach(function (question) {
        const page = question.page || 1;

        if (!groups[page]) {
            groups[page] = [];
        }

        groups[page].push(question);
    });

    return groups;
}

/* ==========================================================
   Create Summary Page Group
   Purpose:
   Creates one visual group for all questions on a page.
========================================================== */

function createSummaryPageGroup(pageNumber, questions) {
    const group = document.createElement("article");

    group.className = "summary-overlay__page-group";

    const title = document.createElement("h3");

    title.className = "summary-overlay__page-title";
    title.textContent = `Page ${pageNumber}`;

    group.appendChild(title);

    questions.forEach(function (question) {
        const questionItem = createSummaryQuestionItem(question);

        group.appendChild(questionItem);
    });

    return group;
}

/* ==========================================================
   Create Summary Question Item
   Purpose:
   Creates a clickable question card.
   On click, closes summary and jumps to the question page.
========================================================== */

function createSummaryQuestionItem(question) {
    const item = document.createElement("button");

    item.className = "summary-overlay__question-item";
    item.type = "button";

    item.innerHTML = `
        <p class="summary-overlay__question-meta">
            Page ${question.page || 1} · ${question.status || "open"}
        </p>

        <p class="summary-overlay__question-text">
            ${question.text || "No question text"}
        </p>

        <p class="summary-overlay__question-meta">
            ${question.isAnonymous ? "Anonymous" : question.studentName || "Student"}
            · Click to return to question
        </p>
    `;

    item.addEventListener("click", function () {
        goToQuestionFromSummary(question);
    });

    return item;
}

/* ==========================================================
   Go To Question From Summary
   Purpose:
   Return from summary overlay to the exact question location.
========================================================== */

async function goToQuestionFromSummary(question) {
    closeSummaryOverlay();

    await pdfViewerManager.goToPage(question.page);

    renderQuestionsForCurrentPage();

    highlightQuestionMarker(question.id);
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

    // Added to open student question Popup:
    if (presentationState.activeTool === "question") {
        if (questionComposePopup.classList.contains("is-visible")) {
            return;
        }

        openQuestionComposePopup(relativePoint, pageNumber, event);

        /*
           One question button press = one placement.
           After opening the popup, we clear the active tool
           so extra PDF clicks do not create more popups.
        */
        clearActiveTool();

        updateStatus("כתוב שאלה ולחץ Save.");
        return;
    }

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