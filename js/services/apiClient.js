// src/js/services/apiClient.js
import { getApiBaseUrl } from '../config/environment.js';

// Helper to get current user (Replaces window.getCurrentDlsUser)
export const getCurrentUser = () => {
    try {
        return JSON.parse(localStorage.getItem('dlsCurrentUser'));
    } catch (error) {
        return null;
    }
};


// Helper to build URL query strings safely (Extracted from dls-api.js)
export const buildQueryString = (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            params.set(key, value);
        }
    });
    const queryString = params.toString();
    return queryString ? `?${queryString}` : "";
};

export const apiClient = async (endpoint , options = {} ) => {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${endpoint}`;

    const currentUser = getCurrentUser();

    const defaultHeaders = {
        "Content-Type": "application/json",
        // If we decide on using JWT tokens later, grab them from localStorage here:
        // "Authorization": `Bearer ${localStorage.getItem('token')}`
    };

    // Auto-inject Auth Headers if the user is logged in
    if (currentUser && (currentUser.id || currentUser._id)) {
        headers["x-user-id"] = currentUser.id || currentUser._id;
    }

    // IMPORTANT: If we are uploading a file (FormData), we MUST delete the Content-Type.
    // The browser will automatically set it to 'multipart/form-data' with the correct boundary.
    if (options.body instanceof FormData) {
        delete headers["Content-Type"];
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        const data = await response.json().catch(() => ({}));

        if(!response.ok) {
            throw new Error(data.message || `API request failed with status ${response.status}`);
        }
        return data;
    } catch(error) {
        console.error(`[API Error] ${endpoint}:`, error);
        throw error;
    }
    
}


    