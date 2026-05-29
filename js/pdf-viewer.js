/* ==========================================================
   PDF VIEWER MANAGER
   File: js/pdf-viewer.js

   Purpose:
   - Load uploaded PDF files.
   - Render PDF pages into pdfCanvas.
   - Keep annotationCanvas and domLayer aligned with the PDF page.
   - Prepare the project for page-based annotations later.
========================================================== */


/* ==========================================================
   1. PDF.js Import
   Purpose:
   Load PDF.js directly inside this module.
========================================================== */

import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

/* Console Warning if PDF has prob with fonts*/
pdfjsLib.VerbosityLevel && (pdfjsLib.GlobalWorkerOptions.verbosity = pdfjsLib.VerbosityLevel.WARNINGS);

/* ==========================================================
   2. Factory Function
   Purpose:
   Create one PDF viewer manager instance.
========================================================== */

export function createPdfViewerManager(config) {
    /* ------------------------------------------------------
       DOM References from config
    ------------------------------------------------------ */

    const slideWrapper = config.slideWrapper;
    const pdfCanvas = config.pdfCanvas;
    const annotationCanvas = config.annotationCanvas;
    const domLayer = config.domLayer;

    const pdfContext = pdfCanvas.getContext("2d");

    const onStatus = config.onStatus || function () { };

    const onPageChange = config.onPageChange || function () { };


    /* ------------------------------------------------------
       Internal PDF State
    ------------------------------------------------------ */

    const pdfState = {
        pdfDocument: null,
        fileName: null,

        currentPage: 1,
        totalPages: 0,

        lastRenderedViewport: null
    };


    /* ======================================================
       3. Load PDF File
       Purpose:
       Read uploaded file and load it into PDF.js.
    ====================================================== */

    async function loadPdfFile(file) {
        if (!file) {
            onStatus("No PDF file selected.");
            return;
        }

        pdfState.fileName = file.name;

        onStatus("Reading PDF file...");

        const arrayBuffer = await file.arrayBuffer();

        onStatus("Loading PDF document...");

        pdfState.pdfDocument = await pdfjsLib.getDocument({
            data: arrayBuffer,

            /* Adobe CMaps:
               Helps PDF.js decode complex font mappings.
               Important for some PDFs with Hebrew / custom font encodings.
            */
            cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/cmaps/",
            cMapPacked: true,

            /* Standard fonts:
               Helps PDF.js when the PDF uses standard/base fonts
               that are not fully embedded inside the PDF.
            */
            standardFontDataUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/standard_fonts/",

            /* Font rendering:
               Keep real font loading enabled.
               ‼️ KEEP TRUE For Fixing Layout in PDF Render ‼️
            */
            disableFontFace: true,

            /* Fallback:
               Allow PDF.js to use system fonts when embedded fonts are missing.
            */
            useSystemFonts: true
        }).promise;

        pdfState.currentPage = 1;
        pdfState.totalPages = pdfState.pdfDocument.numPages;

        onStatus(`PDF loaded: 1 / ${pdfState.totalPages}`);

        await renderCurrentPage();
    }


    /* ======================================================
       4. Render Current Page
       Purpose:
       Render the current PDF page into the PDF canvas.
    ====================================================== */

    async function renderCurrentPage() {
        if (!pdfState.pdfDocument) {
            return;
        }

        const page = await pdfState.pdfDocument.getPage(pdfState.currentPage);

        const wrapperRect = slideWrapper.getBoundingClientRect();

        const originalViewport = page.getViewport({
            scale: 1
        });

        const scaleX = wrapperRect.width / originalViewport.width;
        const scaleY = wrapperRect.height / originalViewport.height;

        const scale = Math.min(scaleX, scaleY);

        const viewport = page.getViewport({
            scale: scale
        });

        pdfState.lastRenderedViewport = viewport;

        resizeLayersToViewport(viewport, wrapperRect);

        clearPdfCanvas();

        await page.render({
            canvasContext: pdfContext,
            viewport: viewport
        }).promise;

        onStatus(`Rendered page ${pdfState.currentPage} / ${pdfState.totalPages}`);
        
        notifyPageChange();
    }

    /* PDF Pages Layout Addon */
    onPageChange({
        currentPage: pdfState.currentPage,
        totalPages: pdfState.totalPages,
        fileName: pdfState.fileName
    });


    /* ======================================================
       5. Resize Layers
       Purpose:
       Make PDF canvas, annotation canvas and DOM layer match
       the rendered PDF page size exactly.
    ====================================================== */

    function resizeLayersToViewport(viewport, wrapperRect) {
        const pageWidth = viewport.width;
        const pageHeight = viewport.height;

        const left = (wrapperRect.width - pageWidth) / 2;
        const top = (wrapperRect.height - pageHeight) / 2;

        resizeCanvasLayer(pdfCanvas, pageWidth, pageHeight, left, top);
        resizeCanvasLayer(annotationCanvas, pageWidth, pageHeight, left, top);
        resizeDomLayer(domLayer, pageWidth, pageHeight, left, top);
    }


    /* Resize a canvas layer visually and internally */
    function resizeCanvasLayer(canvas, width, height, left, top) {
        canvas.width = width;
        canvas.height = height;

        /* Canvas Center for PDF */
        canvas.style.position = "absolute";

        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        canvas.style.left = `${left}px`;
        canvas.style.top = `${top}px`;

        /* Important:
        Prevent old CSS inset/right/bottom from stretching the canvas.
        */
        canvas.style.right = "auto";
        canvas.style.bottom = "auto";
    }


    /* Resize the DOM layer to match the PDF page */
    function resizeDomLayer(layer, width, height, left, top) {
        layer.style.position = "absolute";

        layer.style.width = `${width}px`;
        layer.style.height = `${height}px`;

        layer.style.left = `${left}px`;
        layer.style.top = `${top}px`;

        layer.style.right = "auto";
        layer.style.bottom = "auto";
    }


    /* ======================================================
       6. Canvas Helpers
    ====================================================== */

    function clearPdfCanvas() {
        pdfContext.clearRect(
            0,
            0,
            pdfCanvas.width,
            pdfCanvas.height
        );
    }

    /* ======================================================
   6.1 Page Change Notify
   Purpose:
   Notify presentation-manager.js about current PDF page.
    ====================================================== */

    function notifyPageChange() {
        onPageChange({
            currentPage: pdfState.currentPage,
            totalPages: pdfState.totalPages,
            fileName: pdfState.fileName
        });
    }


    /* ======================================================
       7. Page Navigation
       Purpose:
       Basic page switching API.
       We will connect buttons later.
    ====================================================== */

    async function goToPage(pageNumber) {
        if (!pdfState.pdfDocument) {
            return;
        }

        if (pageNumber < 1 || pageNumber > pdfState.totalPages) {
            return;
        }

        pdfState.currentPage = pageNumber;

        await renderCurrentPage();
    }


    async function goToNextPage() {
        await goToPage(pdfState.currentPage + 1);
    }


    async function goToPreviousPage() {
        await goToPage(pdfState.currentPage - 1);
    }


    /* ======================================================
       8. Public Getters
    ====================================================== */

    function getCurrentPage() {
        return pdfState.currentPage;
    }


    function getTotalPages() {
        return pdfState.totalPages;
    }


    function hasPdf() {
        return pdfState.pdfDocument !== null;
    }

    /* ======================================================
    8.1 Layer Info
    Purpose:
    Expose current page layer rectangle for relative positions.
    ====================================================== */

    function getPageLayerRect() {
        return annotationCanvas.getBoundingClientRect();
    }


    /* ======================================================
       9. Public API
    ====================================================== */

    return {
        loadPdfFile,
        renderCurrentPage,

        goToPage,
        goToNextPage,
        goToPreviousPage,

        getCurrentPage,
        getTotalPages,
        hasPdf,
        getPageLayerRect
    };
}