//src/js/config/environment.js

const ENVIRONMENT = {
    // Check localStorage first, otherwise default to production
    MODE: localStorage.getItem("dlsApiMode") || "production",

    URLS: {
        development: "http://localhost:3000", 
        production: "https://dls-backend-uelx.onrender.com"
    }
};

export const getApiBaseUrl = () => {
    return ENV.URLS[ENV.MODE] || ENV.URLS.production;
};

// devFeature: A helper to switch environments from the browser console
export const setApiMode = (mode) => {
    if (mode === "local" || mode === "production") {
        localStorage.setItem("dlsApiMode", mode);
        location.reload();
    } else if (mode === "reset") {
        localStorage.removeItem("dlsApiMode");
        location.reload();
    } else {
        console.warn("Use: setApiMode('local'), setApiMode('production'), or setApiMode('reset')");
    }
};