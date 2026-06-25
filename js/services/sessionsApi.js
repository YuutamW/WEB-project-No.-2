// src/js/services/sessionsApi.js
import { apiClient, buildQueryString, getCurrentUser } from './apiClient.js';

const SESSIONS_ROUTE = '/api/sessions';

export const getRecentSessions = async (limit = 20) => {
    const currentUser = getCurrentUser();
    if (!currentUser) return [];

    const query = buildQueryString({
        userId: currentUser.id || currentUser._id,
        limit
    });

    const responseData = await apiClient(`${SESSIONS_ROUTE}/recent${query}`, { method: 'GET' });
    return responseData.data || [];
};

export const createSession = async (file, title) => {
    const currentUser = getCurrentUser();
    if (!currentUser) throw new Error("No logged-in user found.");

    const formData = new FormData();
    formData.append("pdf", file);
    formData.append("title", title || "Untitled Session");
    formData.append("ownerId", currentUser.id || currentUser._id);

    const responseData = await apiClient(SESSIONS_ROUTE, {
        method: "POST",
        body: formData
    });

    return responseData.data;
};

export const getSessionByCode = async (code) => {
    if (!code) throw new Error("Missing session code.");
    const responseData = await apiClient(`${SESSIONS_ROUTE}/${encodeURIComponent(code)}`, { method: "GET" });
    return responseData.data || responseData.session;
};