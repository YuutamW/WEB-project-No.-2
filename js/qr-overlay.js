// ======================================================
// DLS QR Overlay
// ------------------------------------------------------
// Opens/closes a QR overlay on the login page.
// ======================================================

(function () {
    const openButton = document.getElementById("openQrOverlayButton");
    const closeButton = document.getElementById("closeQrOverlayButton");
    const overlay = document.getElementById("qrOverlay");

    if (!openButton || !closeButton || !overlay) {
        console.warn("QR overlay elements were not found on this page.");
        return;
    }

    function openQrOverlay() {
        overlay.hidden = false;
        document.body.classList.add("qr-overlay-is-open");
    }

    function closeQrOverlay() {
        overlay.hidden = true;
        document.body.classList.remove("qr-overlay-is-open");
    }

    openButton.addEventListener("click", openQrOverlay);
    closeButton.addEventListener("click", closeQrOverlay);

    overlay.addEventListener("click", function (event) {
        const shouldClose = event.target.hasAttribute("data-close-qr");

        if (shouldClose) {
            closeQrOverlay();
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !overlay.hidden) {
            closeQrOverlay();
        }
    });

    window.openQrOverlay = openQrOverlay;
    window.closeQrOverlay = closeQrOverlay;
})();