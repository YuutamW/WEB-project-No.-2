// ======================================================
// DLS Server Wakeup
// ------------------------------------------------------
// Least invasive version:
// - Does NOT change login logic
// - Does NOT depend on DLS_API
// - Does NOT touch localStorage
// - Does NOT touch sockets
// - Does NOT require backend changes
// - Only sends one small GET request to wake Render
// ======================================================

(function () {
    const DLS_BACKEND_WAKEUP_URL = "https://dls-backend-uelx.onrender.com/";

    async function wakeupDlsServer() {
        try {
            console.log("DLS wakeup: pinging backend...");

            const response = await fetch(DLS_BACKEND_WAKEUP_URL, {
                method: "GET",
                cache: "no-store"
            });

            if (!response.ok) {
                console.warn("DLS wakeup: backend responded with status:", response.status);
                return false;
            }

            console.log("DLS wakeup: backend is awake");
            return true;
        } catch (error) {
            console.warn("DLS wakeup: backend may still be sleeping", error);
            return false;
        }
    }

    // Expose function for console testing:
    // wakeupDlsServer()
    window.wakeupDlsServer = wakeupDlsServer;

    // Auto-run once when this file loads.
    wakeupDlsServer();
})();