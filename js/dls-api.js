/*
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

/* BACKEND URL - Later will replace w/ : https://your-render-backend-url.onrender.com */
const DLS_BACKEND_URL = "https://dls-backend-uelx.onrender.com/";

/* REST API HELPER - create full backend API URL */
function buildApiUrl(path) { return `${DLS_BACKEND_URL}${path}`; }

/* SEND JSON[momoa/derulo] REQUEST - for small fetch req 
Used by: - GET - POST - PUT - DELETE Returns: server JSON response */
async function sendJsonRequest(path, options = {}) {
    const response = await fetch(buildApiUrl(path), {
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        },
        ...options
    });
    const responseData = await response.json();

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
    const queryString = params.toString();
    if (!queryString) {
        return "";
    }
    return `?${queryString}`;
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
            `/api/questions${queryString}`,
            { method: "GET" });
        return responseData.data;
    },

    /* CREATE QUESTION
     Route: POST /api/questions 
     Required: { presentationId, page, x, y, text } */
    async createQuestion(questionData) {
        const responseData = await sendJsonRequest(
            "/api/questions", { method: "POST", body: JSON.stringify(questionData) }); return responseData.data;
    }, /* UPDATE QUESTION Route: PUT /api/questions/:id */
    async updateQuestion(questionId, updateData) {
        const responseData = await sendJsonRequest(
            `/api/questions/${questionId}`,
            {
                method: "PUT",
                body: JSON.stringify(updateData)
            });
        return responseData.data;
    },
    /* DELETE QUESTION Route: DELETE /api/questions/:id */
    async deleteQuestion(questionId) {
        const responseData = await sendJsonRequest(
            `/api/questions/${questionId}`, {
            method: "DELETE"
        });
        return responseData.data;
    }
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
        dlsSocketInstance = io(DLS_BACKEND_URL);
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