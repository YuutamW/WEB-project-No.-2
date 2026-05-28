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

    laserColor: "#ff3b3b"
};

let toolOptionsHideTimer = null;

let teacherControlsHideTimer = null;

let shouldKeepToolbarHiddenUntilMouseLeavesBottom = false;

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
}


/* ==========================================================
   5. File Upload Handling
   Purpose:
   Detect selected file type and update the mockup state.
========================================================== */

function handlePresentationFileUpload(event) {
    const file = event.target.files[0];

    if (!file) {
        updateStatus("No file selected.");
        return;
    }

    presentationState.currentFile = file;

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".pdf")) {
        updateStatus("PDF selected. PDF rendering will be added next.");
        activatePresentationMode();
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
   13. Helpers
   Purpose:
   Small reusable utility functions.
========================================================== */

/* Updates the upload/status text */
function updateStatus(message) {
    presentationStatusText.textContent = message;
}