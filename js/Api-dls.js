/*  Dor Mandel :       ID: 315313825
    Yotam Weintraub:   ID: 321610859 
    Alex Tkachenkov:   ID: 318760543
*/


const DLS_CONFIG = {
    BACKEND_URL: "https://dls-backend-uelx.onrender.com",
    FRONTEND_URL: "https://yuutamw.github.io/WEB-project-No.-2/",

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

    FEATURE_FLAGS: {
        RECENT_SESSIONS_API: true
    },
};

function isLocalFrontend() {
    return (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" 
        // Added for internal testing Streaming data:
        // host.startsWith("192.168.") ||
        // host.startsWith("10.") ||
        // host.startsWith("172.")
    );
}

const API_BASE = (isLocalFrontend())
    ? 'http://localhost:3000'
    : 'https://dls-backend-uelx.onrender.com';

function getDlsBackendUrl() { return API_BASE; }
/* Apply backend URL after helper exists */
DLS_CONFIG.BACKEND_URL = getDlsBackendUrl();

/* REST API HELPER - create full backend API URL */
// function buildApiUrl(path) { return `${DLS_CONFIG.BACKEND_URL}${path}`; }
function buildApiUrl(path) {
    const baseUrl = getDlsBackendUrl();

    DLS_CONFIG.BACKEND_URL = baseUrl;
    window.DLS_BACKEND_URL = baseUrl;

    return `${baseUrl}${path}`;
}

/* SEND JSON[momoa/derulo] REQUEST - for small fetch req WRAPPER
Used by: - GET - POST - PUT - DELETE Returns: server JSON response 
changed order if options has own header will be first 
*/
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
Ex.: { sessionId: "demo", page: 2 } -> ?sessionId=demo&page=2 */
function buildQueryString(filters = {}) {
    const params = new URLSearchParams();
    if (filters.code) {
        params.set("code", filters.code);
    }
    if (filters.sessionId) {
        params.set("sessionId", filters.sessionId);
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
     { sessionId, page, status, search } */
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
     { sessionId, page, status, search } 
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
     Required: { sessionId, page, x, y, text } */
    // async createQuestion(questionData) {

    //     const currentUser = getCurrentDlsUser();
    //     const questionPayload = { ...questionData, studentId: currentUser.id };

    //     const responseData = await sendJsonRequest(
    //         DLS_CONFIG.ROUTES.QUESTIONS,
    //         { method: "POST", body: JSON.stringify(questionPayload) });

    //     return responseData.data;

    // },
    async createQuestion(questionData) {
        const currentUser = getCurrentDlsUser();

        const questionPayload = {
            ...questionData,
            code: questionData.code || questionData.sessionId,
            studentId:
                questionData.studentId ||
                currentUser?.id ||
                currentUser?._id ||
                null
        };

        const responseData = await sendJsonRequest(
            DLS_CONFIG.ROUTES.QUESTIONS,
            {
                method: "POST",
                body: JSON.stringify(questionPayload)
            }
        );

        return responseData.data || responseData.question || responseData;
    },

    /* DELETE QUESTION Route: DELETE /api/questions/:id */
    async deleteQuestion(questionId) {
        const responseData = await sendJsonRequest(
            `${DLS_CONFIG.ROUTES.QUESTIONS}/${questionId}`, {
            method: "DELETE"
        });
        return responseData.data;
    },

    /* UPDATE CURRENT USER
       Route: PUT /api/users/edit
       Required body: { _id, firstName, lastName, email, role?, password? }
    */
    async updateUser(updatedFields) {
        const currentUser = getCurrentDlsUser();

        if (!currentUser) {
            throw new Error("No logged-in user found.");
        }

        const userId =
            updatedFields._id ||
            updatedFields.id ||
            currentUser._id ||
            currentUser.id;

        if (!userId) {
            throw new Error("Missing user id.");
        }

        const responseData = await sendJsonRequest(
            "/api/users/edit",
            {
                method: "PUT",
                body: JSON.stringify({
                    ...updatedFields,
                    _id: userId
                })
            }
        );

        return responseData.data || responseData.user || responseData;
    },

    /* DELETE CURRENT USER
       Route: DELETE /api/users/:id
    */
    async deleteUser(userId) {
        if (!userId) {
            throw new Error("Missing user id.");
        }

        return sendJsonRequest(
            "/api/users/" + encodeURIComponent(userId),
            {
                method: "DELETE"
            }
        );
    },

    /* GET RECENT SESSIONS 
     Route: GET /api/sessions/recent (Planned) */
    async getRecentSessions(limit = 5) {
        // added flag control:
        if (!DLS_CONFIG.FEATURE_FLAGS?.RECENT_SESSIONS_API) {
            return [];
        }

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

    /* CREATE SESSION
   Route: POST /api/sessions
*/
    async createSession(file, title) {
        const currentUser = getCurrentDlsUser();

        if (!currentUser) {
            throw new Error("No logged-in user found.");
        }

        const ownerId = currentUser.id || currentUser._id;

        if (!ownerId) {
            throw new Error("Missing lecturer user id.");
        }

        const formData = new FormData();
        formData.append("pdf", file); // Must match backend multer: upload.single('pdf')
        formData.append("title", title || "Untitled Session");
        formData.append("ownerId", ownerId);

        const response = await fetch(buildApiUrl(DLS_CONFIG.ROUTES.SESSIONS), {
            method: "POST",
            body: formData,
            headers: {
                "x-user-id": ownerId // Required by backend requireAuth middleware
            }
        });

        const responseData = await response.json().catch(function () {
            return {};
        });

        if (!response.ok)
            throw new Error(responseData.message || "Failed to create session on backend");

        // Returns backend payload: { code, pdfUrl, title }
        return responseData.data;
    },

    /* GET SESSION BY CODE
       Route: GET /api/sessions/:code
    */
    async getSessionByCode(code) {
        const cleanCode = String(code || "").trim();

        if (!cleanCode) {
            throw new Error("Missing session code.");
        }

        const responseData = await sendJsonRequest(
            `${DLS_CONFIG.ROUTES.SESSIONS}/${encodeURIComponent(cleanCode)}`,
            {
                method: "GET"
            }
        );

        return responseData.data || responseData.session || responseData;
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
    },
    /*  END OF SESSIONS API METHODS */
    async endSession(code) {
        const cleanCode = String(code || "").trim();

        if (!cleanCode) {
            throw new Error("Missing session code.");
        }

        const currentUser = getCurrentDlsUser();
        const userId = currentUser?.id || currentUser?._id;

        const responseData = await sendJsonRequest(
            `${DLS_CONFIG.ROUTES.SESSIONS}/${encodeURIComponent(cleanCode)}`,
            {
                method: "DELETE",
                headers: userId
                    ? {
                        "x-user-id": userId
                    }
                    : {}
            }
        );

        return responseData.data || responseData;
    },

    /* FETCH SESSION PDF BLOB
       Route: GET /api/sessions/:code/pdf
       Used by students to download the live presentation.
    */
    async fetchSessionPdfAsBlob(code) {
        const cleanCode = String(code || "").trim();
        if (!cleanCode) throw new Error("Missing session code.");

        const response = await fetch(buildApiUrl(`${DLS_CONFIG.ROUTES.SESSIONS}/${cleanCode}/pdf`), {
            method: "GET",
            // Include auth header if our backend requireAuth middleware demands it for GETs too
            headers: {
                "x-user-id": getCurrentDlsUser()?.id || getCurrentDlsUser()?._id
            }
        });

        if (!response.ok) {
            throw new Error("Failed to fetch presentation PDF.");
        }

        return await response.blob();
    },
};

window.DLS_CONFIG = DLS_CONFIG;
window.getCurrentDlsUser = getCurrentDlsUser;

// only if neccessary:
window.DLS_BACKEND_URL = DLS_CONFIG.BACKEND_URL;

window.DLS_SET_API_MODE = function (mode) {
    if (mode === "local" || mode === "prod") {
        localStorage.setItem("dlsApiMode", mode);
        location.reload();
        return;
    }

    if (mode === "reset") {
        localStorage.removeItem("dlsApiMode");
        location.reload();
        return;
    }

    console.warn("Use: DLS_SET_API_MODE('local'), DLS_SET_API_MODE('prod'), or DLS_SET_API_MODE('reset')");
};

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
        dlsSocketInstance = io(getDlsBackendUrl());
        dlsSocketInstance.on("connect", function () {
            console.log(`DLS socket connected: ${dlsSocketInstance.id}`);
        });
        dlsSocketInstance.on("disconnect", function () {
            console.log("DLS socket disconnected");
        });
        dlsSocketInstance.on("server:welcome", function (data) {
            console.log("DLS socket welcome:", data);
        });
        // added join room debug:
        dlsSocketInstance.on("presentation:joined", function (data) {
            console.log("[DLS SOCKET] joined room:", data);
        });

        dlsSocketInstance.onAny(function (eventName, ...args) {
            console.log("[DLS SOCKET IN]", eventName, args);
        });
        return dlsSocketInstance;
    },

    /* JOIN PRESENTATION Purpose: Join backend room by sessionId.
     Ex.: presentation:demo-presentation */
    // joinPresentation(sessionId) {
    //     const socket = this.connect();
    //     if (!socket) { return; }
    //     const cleanSessionId = String(sessionId || "").trim();
    //     if (!cleanSessionId) {
    //         console.warn("Cannot join presentation - missing sessionId");
    //         socket.disconnect(); // <-- added this!
    //         return;
    //     }
    //     const joinPayload = {
    //         sessionId: cleanCode,
    //         code: cleanCode
    //     };
    //     if (socket.connected) {
    //         emitJoin();
    //     } else {
    //         socket.once("connect", emitJoin);
    //     }
    //     //socket.emit("presentation:join", { sessionId });
    // },

    // Server Listens to session:join -> socket.join("presentation:" + sessionId)
    joinPresentation(sessionId) {
        const socket = this.connect();

        if (!socket) {
            return;
        }

        const cleanSessionId = String(sessionId || "").trim();

        if (!cleanSessionId) {
            console.warn("Cannot join session room - missing sessionId");
            return;
        }

        function emitJoin() {
            console.log("DLS joining session room:", cleanSessionId);

            socket.emit("session:join", {
                sessionId: cleanSessionId
            });
        }

        if (socket.connected) {
            emitJoin();
        } else {
            socket.once("connect", emitJoin);
        }
    },

    /* ON SESSION PARTICIPANTS UPDATED
       Listen when someone joins/leaves a live session.
    */
    onSessionParticipantsUpdated(callback) {
        const socket = this.connect();

        if (!socket) {
            return;
        }

        // switched from "presentation:participants_updated" to "session:participantsUpdated"
        socket.off("session:participantsUpdated");
        socket.on("session:participantsUpdated", callback);
    },

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
    },

};

// ------------------------------  REVISED -------------------------
/* GLOBAL EXPORTS - expose helpers to VanillaJS files (other) 
Other files can use: DLS_API.getQuestions(), DLS_SOCKET.joinPresentation() */
window.DLS_API = DLS_API;
window.DLS_SOCKET = DLS_SOCKET;
