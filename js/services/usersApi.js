import { apiClient, buildQueryString, getCurrentUser } from './apiClient.js';
import { getApiBaseUrl } from '../config/environment.js';

// apiClient already handles the base URL
const USERS_ROUTE = "/api/users";
const SIGN_UP_PATH = USERS_ROUTE + "/signup";
const LOGIN_PATH = USERS_ROUTE + "/login"
const UPDATE_PATH = USERS_ROUTE + "/edit";


export const registerUser = async (userData) => {
    // We pass the endpoint and the fetch options.
    // apiClient handles the Base URL, headers, and error throwing.
    try {
        const responseData = await apiClient(`${SIGN_UP_PATH}`, {
            method: "POST",
            body: JSON.stringify(userData)
        });
        console.log("DEBUG: login accepted");
        return responseData;
    } catch (error) {
        console.error("Error in registerUser", error);
        throw error;
    }
};


export const loginUser = async (email, password) => {
    try {
        const responseData = await apiClient(`${LOGIN_PATH}`, {
            method: "POST",
            body: JSON.stringify({ email, password })
        });
        console.log("DEBUG: login accepted");
        return responseData;
    } catch (error) {
        console.error("Error in loginUser", error);
        throw error;
    }
};


export const updateUser = async (updateFields) => {
    const currentUser = getCurrentUser();

    if(!currentUser) 
        throw new Error("No logged in user found.");

    // grab the ID from either the updated fields or the current user cache
    const userId = updatedFields._id || updatedFields.id || currentUser._id || currentUser.id;    

    if(!userId)
        throw new Error("Missing user id");

    try {
        const responseData = await apiClient(`${UPDATE_PATH}`,{
            method: "POST",
            body: JSON.stringify({
                ...updatedFields,
                _id: userId
            })
        });
        return responseData.userData
    } catch (error) {
        console.error("Error in updateUser:", error);
        throw error;
    }
};

export const deleteUser = async (userId) => {
    if (!userId) {
        throw new Error("Missing user id.");
    }

    try {
        const responseData = await apiClient(`${USERS_ROUTE}/${encodeURIComponent(userId)}`, {
            method: "DELETE"
        });
        
        return responseData;
    } catch (error) {
        console.error("Error in deleteUser:", error);
        throw error;
    }
};