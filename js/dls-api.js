/*
   DLS API CONFIG
   ---------------------------------------------------------
   One place to change/update backend URL, API routes, and local keys.
   ---
Stage 3A:
    Create frontend API helper file

Stage 3B:
    Load existing questions from backend

Stage 3C:
    Save new questions to backend instead of only localStorage

Stage 3D:
    Listen to Socket.IO events and update drawer/dots live

Stage 3E:
    Keep localStorage fallback only if backend is unavailable
---
CONTAIN:
// DLS_API = REST / fetch functions
// Save / load / update / delete data from backend.
DLS_API.getQuestions()      - GET /api/questions
DLS_API.createQuestion()    - POST /api/questions
DLS_API.updateQuestion()    - PUT /api/questions/:id
DLS_API.deleteQuestion()    - DELETE /api/questions/:id

// DLS_SOCKET = Socket.IO realtime functions
// Receive live updates without refresh.
DLS_SOCKET.connect()            - connect frontend to backend socket server
DLS_SOCKET.joinPresentation()   - join room: presentation:demo-presentation 
DLS_SOCKET.onQuestionCreated()  - listen to question:created
DLS_SOCKET.onQuestionUpdated()  - listen to question:updated
DLS_SOCKET.onQuestionDeleted()  - listen to question:deleted

to keep question-manager clean from fetch + socket details
*/

const DLS_CONFIG = {
    BACKEND_URL: "https://dls-backend-uelx.onrender.com",

    ROUTES: {
        SIGNUP: "/signup",
        QUESTIONS: "/api/questions",
        SESSIONS: "/api/sessions"
    },

    DEFAULTS: {
        PRESENTATION_ID: "demo-presentation"
    },

    // for questions:
    STORAGE_KEYS: {
        CURRENT_USER: "dlsCurrentUser",
        CURRENT_SESSION: "dlsCurrentSession",
        PENDING_QUESTIONS: "dlsPendingQuestions"
    },
};

/* REST API HELPER - create full backend API URL */
function buildApiUrl(path) { return `${DLS_CONFIG.BACKEND_URL}${path}`; }

/* SEND JSON[momoa/derulo] REQUEST - for small fetch req WRAPPER
Used by: - GET - POST - PUT - DELETE Returns: server JSON response 
changed order if options has own header will be first */
async function sendJsonRequest(path, options = {}) {
    const response = await fetch(buildApiUrl(path), {
        // ... = spreadOperator = take all fields from this object and paste them here.
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const responseData = await response.json().catch(function () {
        return {};
    });

    if (!response.ok) {
        throw new Error(responseData.message || "API request failed");
    }

    return responseData;
}

/* BUILD QUERY STRING - convert filters obj -> URL query string 
Ex.: { presentationId: "demo", page: 2 } -> ?presentationId=demo&page=2 */
function buildQueryString(filters = {}) {
    const params = new URLSearchParams();
    if (filters.presentationId) {
        params.set("presentationId", filters.presentationId);
    }
    if (filters.page !== undefined && filters.page !== null) {
        params.set("page", filters.page);
    }
    if (filters.status) {
        params.set("status", filters.status);
    }
    if (filters.search) {
        params.set("search", filters.search);
    }
    if (filters.studentId) {
        params.set("studentId", filters.studentId);
    }

    if (filters.studentEmail) {
        params.set("studentEmail", filters.studentEmail);
    }
    if (filters.userId) {
        params.set("userId", filters.userId);
    }
    if (filters.limit) {
        params.set("limit", filters.limit);
    }
    const queryString = params.toString();
    return queryString ? `?${queryString}` : "";
}

/* CURRENT USER HELPER
    Read current logged-in user from one known place.
        Later:   If we replace localStorage with real session/JWT,
                 we update this function only. */
function getCurrentDlsUser() {
    const savedUserJson = localStorage.getItem(
        DLS_CONFIG.STORAGE_KEYS.CURRENT_USER
    );

    if (!savedUserJson) {
        return null;
    }

    try {
        return JSON.parse(savedUserJson);
    } catch (error) {
        console.warn("Invalid current user in localStorage:", error);
        return null;
    }
}

/* DLS_API - REST/FETCH funcs */
const DLS_API = {
    /* GET QUESTIONS
     Route:
     GET /api/questions
     Optional filters:
     { presentationId, page, status, search } */
    async getQuestions(filters = {}) {
        const queryString = buildQueryString(filters);

        const responseData = await sendJsonRequest(
            `${DLS_CONFIG.ROUTES.QUESTIONS}${queryString}`,
            { method: "GET" });
        return responseData.data || [];
    },
    /* GET MY QUESTIONS
     Route:
     GET /api/questions
     Optional filters:
     { presentationId, page, status, search } 
     This function adds studentId and studentEmail to the filter params. */
    async getMyQuestions(filters = {}) {
        const currentUser = getCurrentDlsUser();

        if (!currentUser) {
            return [];
        }

        const myFilters = {
            ...filters,
            studentId: currentUser.id || currentUser._id || null,
            studentEmail: currentUser.email || null
        };

        return this.getQuestions(myFilters);
    },

    /* CREATE QUESTION
     Route: POST /api/questions 
     Required: { presentationId, page, x, y, text } */
    async createQuestion(questionData) {

        const currentUser = getCurrentDlsUser();

        const questionPayload = {
            ...questionData,

            studentId: currentUser?.id || currentUser?._id || null,
            studentEmail: currentUser?.email || null,
            studentName: currentUser
                ? `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim()
                : "Anonymous"
        };

        const responseData = await sendJsonRequest(
            DLS_CONFIG.ROUTES.QUESTIONS,
            { method: "POST", body: JSON.stringify(questionPayload) }); return responseData.data;
    },

    /* UPDATE QUESTION Route: PUT /api/questions/:id */
    async updateQuestion(questionId, updateData) {
        const responseData = await sendJsonRequest(
            `${DLS_CONFIG.ROUTES.QUESTIONS}/${questionId}`,
            {
                method: "PUT",
                body: JSON.stringify(updateData)
            });
        return responseData.data;
    },

    /* DELETE QUESTION Route: DELETE /api/questions/:id */
    async deleteQuestion(questionId) {
        const responseData = await sendJsonRequest(
            `${DLS_CONFIG.ROUTES.QUESTIONS}/${questionId}`, {
            method: "DELETE"
        });
        return responseData.data;
    },

    /* GET RECENT SESSIONS 
     Route: GET /api/sessions/recent (Planned) */
    async getRecentSessions(limit = 5) {
        if (!window.DLS_API) {
            console.error("DLS_API not loaded – recent sessions will not render.");
            return;
        }
        const currentUser = getCurrentDlsUser();

        if (!currentUser) {
            // No logged‑in user → return empty list (or maybe throw? - need to decide.)
            return [];
        }

        const query = buildQueryString({
            userId: currentUser.id || currentUser._id,
            limit
        });

        const responseData = await sendJsonRequest(
            `${DLS_CONFIG.ROUTES.SESSIONS}/recent${query}`,
            { method: "GET" }
        );

        return responseData.data || [];
    },

    /* JOIN SESSION
        Route:
        POST /api/sessions/:code/join
        
        Used by:
        student-dashboard.html -> Join session overlay
        
        Payload:
        { userId }
    */
    async joinSession(code, payload = {}) {
        const cleanCode = String(code || "").trim();

        if (!cleanCode) {
            throw new Error("Missing session code");
        }

        const responseData = await sendJsonRequest(
            `${DLS_CONFIG.ROUTES.SESSIONS}/${encodeURIComponent(cleanCode)}/join`,
            {
                method: "POST",
                body: JSON.stringify(payload)
            }
        );

        return responseData.data || responseData;
    }
};

window.DLS_CONFIG = DLS_CONFIG;
window.DLS_API = DLS_API;
window.getCurrentDlsUser = getCurrentDlsUser;
// only if neccessary:
window.DLS_BACKEND_URL = DLS_CONFIG.BACKEND_URL;

/* SOCKET IO HELPER */

/* SOCKET INSTANCE Saved after connection. */
let dlsSocketInstance = null;

/* CHECK SOCKET CLIENT Purpose: Make sure Socket.IO client script loaded before this file. */
function isSocketClientAvailable() {
    return typeof io === "function";
}

/* DLS SOCKET - Realtime SocketIO funcs */
const DLS_SOCKET = {
    /* CONNECT Purpose: Connect Part A frontend to Part B backend Socket.IO server. Returns: socket instance or null */
    connect() {
        if (!isSocketClientAvailable()) {
            console.warn("Socket.IO client is not loaded. Missing socket.io.js script.");
            return null;
        }
        if (dlsSocketInstance) {
            return dlsSocketInstance;
        }
        dlsSocketInstance = io(DLS_CONFIG.BACKEND_URL);
        dlsSocketInstance.on("connect", function () {
            console.log(`DLS socket connected: ${dlsSocketInstance.id}`);
        });
        dlsSocketInstance.on("disconnect", function () {
            console.log("DLS socket disconnected");
        });
        dlsSocketInstance.on("server:welcome", function (data) {
            console.log("DLS socket welcome:", data);
        });
        return dlsSocketInstance;
    },
    /* JOIN PRESENTATION Purpose: Join backend room by presentationId.
     Ex.: presentation:demo-presentation */
    joinPresentation(presentationId) {
        const socket = this.connect();
        if (!socket) { return; }
        if (!presentationId) {
            console.warn("Cannot join presentation - missing presentationId");
            return;
        }
        socket.emit("presentation:join", { presentationId });
    },

    /* --- DEBUG CHECK IF REALLY NEEDED HERE --- */
    /* JOIN SESSION
        Route:
        POST /api/sessions/:code/join

        Used by:
        student-dashboard.html -> Join session overlay

        Payload:
        { userId }
    */
    // async joinSession(code, payload = {}) {
    //     const cleanCode = String(code || "").trim();

    //     if (!cleanCode) {
    //         throw new Error("Missing session code");
    //     }

    //     const responseData = await sendJsonRequest(
    //         `${DLS_CONFIG.ROUTES.SESSIONS}/${encodeURIComponent(cleanCode)}/join`,
    //         {
    //             method: "POST",
    //             body: JSON.stringify(payload)
    //         }
    //     );

    //     return responseData.data || responseData;
    // },
    
    /* ON QUESTION CREATED Purpose: Listen to new question events. */
    onQuestionCreated(callback) {
        const socket = this.connect();
        if (!socket) { return; }
        socket.on("question:created", callback);
    },
    /* ON QUESTION UPDATED Purpose: Listen to updated question events. */
    onQuestionUpdated(callback) {
        const socket = this.connect();
        if (!socket) { return; }
        socket.on("question:updated", callback);
    },
    /* ON QUESTION DELETED Purpose: Listen to deleted question events. */
    onQuestionDeleted(callback) {
        const socket = this.connect();
        if (!socket) { return; }
        socket.on("question:deleted", callback);
    },

    /* Added Disconnection for end connection */
    disconnect() {
        if (!dlsSocketInstance) {
            return;
        }

        dlsSocketInstance.disconnect();
        dlsSocketInstance = null;

        console.log("DLS socket disconnected by logout");
    }
};

/* GLOBAL EXPORTS - expose helpers to VanillaJS files (other) 
Other files can use: DLS_API.getQuestions(), DLS_SOCKET.joinPresentation() */
window.DLS_API = DLS_API;
window.DLS_SOCKET = DLS_SOCKET;

/* CHAIN OF OPS: 
PART A CONSOLE -> 
DLS_API.createQ -> 
PART B REST_API ->
BeckendStore -> 
SocketIO room emit -> 
PART A Recieves live event */

