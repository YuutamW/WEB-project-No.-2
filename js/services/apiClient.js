// src/js/services/apiClient.js
import { getApiBaseUrl } from '../config/environment.js';

export const apiClient = async (endpoint , options = {} ) => {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${endpoint}`;
    

    const defaultHeaders = {
        "Content-Type": "application/json",
        // If we decide on using JWT tokens later, grab them from localStorage here:
        // "Authorization": `Bearer ${localStorage.getItem('token')}`
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
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