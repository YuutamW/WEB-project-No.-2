//src/js/config/environment.js

const ENVIRONMENT = {
    MODE: "development",

    URLS: {
        development: "http://localhost:3000", 
        production: "https://dls-backend-uelx.onrender.com"
    }
};

export const getApiBaseUrl = () => {
    // DEBUGGING: URL override for quick testing without changing code
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("env") === "prod") return ENV.URLS.production;
    if (urlParams.get("env") === "dev") return ENV.URLS.development;

    return ENV.URLS[ENV.MODE];
};