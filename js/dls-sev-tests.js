(function () {
    "use strict";

    function getBackendUrl() {
        if (window.DLS_CONFIG?.BACKEND_URL) {
            return window.DLS_CONFIG.BACKEND_URL;
        }

        if (window.DLS_AUTH_API_BASE_URL) {
            return window.DLS_AUTH_API_BASE_URL;
        }

        return "https://dls-backend-uelx.onrender.com";
    }

    async function jsonFetch(path, options = {}) {
        const url = path.startsWith("http")
            ? path
            : getBackendUrl() + path;

        const response = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });

        const data = await response.json().catch(function () {
            return {};
        });

        if (!response.ok) {
            throw new Error(data.message || "Request failed");
        }

        return data;
    }

    function env() {
        console.table({
            href: location.href,
            origin: location.origin,
            backend: getBackendUrl(),
            apiMode: localStorage.getItem("dlsApiMode"),
            devTools: localStorage.getItem("dlsDevTools"),
            dlsConfig: typeof window.DLS_CONFIG,
            dlsApi: typeof window.DLS_API,
            authApi: window.DLS_AUTH_API_BASE_URL
        });
    }

    function login(email, password) {
        return jsonFetch("/api/users/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        }).then(function (data) {
            console.log("login ok:", data);
            return data;
        });
    }

    function health() {
        return jsonFetch("/api/health").then(console.log);
    }

    window.DLS_TESTS = {
        env,
        login,
        health,
        jsonFetch,
        getBackendUrl
    };

    console.log("DLS_TESTS loaded. Run DLS_TESTS.env()");
})();