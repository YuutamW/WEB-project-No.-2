// Dor Mandel :       ID: 315313825
// Yotam Weintraub:   ID: 321610859
/* =========================================================
   DLS AUTH MANAGER — POC VERSION
   ---------------------------------------------------------
   File: js/auth.js

   Purpose:
   - Keep login as Email + Password.
   - Load fixed demo users from data/sample-users.json.
   - Save registered users locally in localStorage.
   - Redirect lecturer users to dashboard.html.

   Important:
   This is only a frontend POC.
   Passwords in JSON/localStorage are NOT secure.
   Real systems require backend authentication + hashed passwords.
========================================================= */


/* =========================================================
   1. Constants
   Purpose:
   Central paths and localStorage keys.
========================================================= */

const USERS_JSON_PATH = "data/sample-users.json";
const REGISTERED_USERS_STORAGE_KEY = "dlsRegisteredUsers";
const CURRENT_USER_STORAGE_KEY = "dlsCurrentUser";
/* when front + back together - put "" */
const API_BASE_URL = "http://localhost:3000";


/* =========================================================
   2. Validation Helpers
   Purpose:
   Small reusable field checks.
========================================================= */

function isValidEmail(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailPattern.test(email);
}


function isValidPassword(password) {
    const hasMinLength = password.length >= 6;
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    return hasMinLength && hasLowercase && hasUppercase && hasNumber;
}


function createUserId() {
    return `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}


/* =========================================================
   3. Message Helpers
   Purpose:
   Show form feedback in one consistent place.
========================================================= */

function showMessage(element, type, text) {
    if (!element) {
        return;
    }

    element.className = `form-message ${type}`;
    element.textContent = text;
}


function updateEmailIndicator(input, statusElement, hintElement) {
    const value = input.value.trim();

    if (!statusElement || !hintElement) {
        return;
    }

    if (value === "") {
        statusElement.className = "input-status";
        statusElement.textContent = "";

        hintElement.className = "field-hint";
        hintElement.textContent = "נבדוק שהאימייל כתוב במבנה תקין.";

        return;
    }

    if (isValidEmail(value)) {
        statusElement.className = "input-status valid";
        statusElement.textContent = "✓";

        hintElement.className = "field-hint valid";
        hintElement.textContent = "מבנה האימייל נראה תקין.";

        return;
    }

    statusElement.className = "input-status invalid";
    statusElement.textContent = "!";

    hintElement.className = "field-hint invalid";
    hintElement.textContent = "מבנה אימייל לדוגמה: name@example.com";
}


/* =========================================================
   4. JSON + Local Storage User Sources
   Purpose:
   Combine fixed demo users and locally registered users.
========================================================= */

async function loadDemoUsersFromJson() {
    try {
        const response = await fetch(USERS_JSON_PATH);

        if (!response.ok) {
            console.warn("Could not load sample-users.json");
            return [];
        }

        const data = await response.json();

        return data.users || [];
    } catch (error) {
        console.warn("Failed loading sample users JSON:", error);
        return [];
    }
}


function loadRegisteredUsersFromStorage() {
    const savedUsersJson = localStorage.getItem(REGISTERED_USERS_STORAGE_KEY);

    if (!savedUsersJson) {
        return [];
    }

    try {
        return JSON.parse(savedUsersJson);
    } catch (error) {
        console.warn("Registered users localStorage is invalid. Resetting.");

        localStorage.removeItem(REGISTERED_USERS_STORAGE_KEY);

        return [];
    }
}


function saveRegisteredUsersToStorage(users) {
    localStorage.setItem(
        REGISTERED_USERS_STORAGE_KEY,
        JSON.stringify(users, null, 2)
    );
}


async function loadAllUsers() {
    const demoUsers = await loadDemoUsersFromJson();
    const localUsers = loadRegisteredUsersFromStorage();

    return demoUsers.concat(localUsers);
}


/* =========================================================
   5. User Matching
   Purpose:
   Login only by email + password.
========================================================= */

async function findMatchingUserByEmail(email, password) {
    const users = await loadAllUsers();

    const normalizedEmail = email.toLowerCase();

    return users.find(function (user) {
        if (!user.email) {
            return false;
        }

        const userEmail = user.email.toLowerCase();

        return userEmail === normalizedEmail &&
            user.password === password;
    });
}


async function isEmailAlreadyRegistered(email) {
    const users = await loadAllUsers();

    const normalizedEmail = email.toLowerCase();

    return users.some(function (user) {
        return user.email &&
            user.email.toLowerCase() === normalizedEmail;
    });
}


function saveCurrentUser(user) {
    const safeUser = {
        id: user.id || null,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        email: user.email,
        role: user.role || "student",
        source: user.source || "sample-users.json"
    };

    localStorage.setItem(
        CURRENT_USER_STORAGE_KEY,
        JSON.stringify(safeUser, null, 2)
    );
}


function getRedirectByUser(user) {
    if (user.redirect) {
        return user.redirect;
    }

    if (user.role === "lecturer" || user.role === "assistant") {
        return "dashboard.html";
    }

    return "dashboard.html";
}

/* HELPER - Send real Post to Server */
async function registeredUserOnServer(registeredPayload) {
    const response = await fetch(API_BASE_URL + "/api/users", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(registeredPayload)
    });

    const data = await response.json().catch(function () {
        return {};
    });

    if (!response.ok) {
        throw new Error(data.message || "Register request failed. ");
    }
    return data;
}


/* =========================================================
   6. Register Flow
   Purpose:
   Validate register.html and save the user locally.
========================================================= */

const registerForm = document.querySelector("#registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", handleRegisterSubmit);
}


async function handleRegisterSubmit(event) {
    event.preventDefault();

    const firstNameInput = document.querySelector("#firstName");
    const lastNameInput = document.querySelector("#lastName");
    const emailInput = document.querySelector("#email");
    const roleInput = document.querySelector("#role");
    const passwordInput = document.querySelector("#password");
    const termsInput = document.querySelector("#terms");
    const message = document.querySelector("#registerMessage");

    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const email = emailInput.value.trim();
    const role = roleInput.value;
    const password = passwordInput.value;
    const termsAccepted = termsInput.checked;

    if (firstName === "" || lastName === "") {
        showMessage(message, "error", "יש למלא שם פרטי ושם משפחה.");
        return;
    }

    if (!isValidEmail(email)) {
        showMessage(message, "error", "האימייל לא כתוב בצורה תקינה.");
        return;
    }

    if (role === "") {
        showMessage(message, "error", "יש לבחור סוג משתמש.");
        return;
    }

    if (!isValidPassword(password)) {
        showMessage(
            message,
            "error",
            "הסיסמה חייבת להכיל לפחות 6 תווים, אות קטנה, אות גדולה ומספר."
        );
        return;
    }

    if (!termsAccepted) {
        showMessage(message, "error", "יש לאשר את תנאי השימוש.");
        return;
    }

    const alreadyExists = await isEmailAlreadyRegistered(email);

    if (alreadyExists) {
        showMessage(message, "error", "משתמש עם האימייל הזה כבר קיים.");
        return;
    }

    // const newUser = {
    //     id: createUserId(),

    //     firstName: firstName,
    //     lastName: lastName,

    //     email: email,
    //     password: password,
    //     role: role,

    //     redirect: role === "lecturer" || role === "assistant"
    //         ? "dashboard.html"
    //         : "dashboard.html",

    //     createdAt: new Date().toISOString(),
    //     source: "localStorage"
    // };


    // const registeredUsers = loadRegisteredUsersFromStorage();

    // registeredUsers.push(newUser);

    // saveRegisteredUsersToStorage(registeredUsers);

    // showMessage(
    //     message,
    //     "success",
    //     "ההרשמה הצליחה. עכשיו אפשר להתחבר עם האימייל והסיסמה."
    // );

    // registerForm.reset();

    /* Sends Signup to Backend */
    const registerPayload = {
        firstName: firstName,
        lastName: lastName,
        email: email,
        role: role,
        password: password,
        termsAccepted: termsAccepted
    };

    try {
        const result = await registerUserOnServer(registerPayload);

        showMessage(
            message,
            "success",
            result.message || "ההרשמה הצליחה. עכשיו אפשר להתחבר עם האימייל והסיסמה."
        );

        registerForm.reset();
    } catch (error) {
        showMessage(
            message,
            "error",
            error.message || "שגיאה בהרשמה מול השרת."
        );
    }

}


/* =========================================================
   7. Login Flow
   Purpose:
   Login by email + password and redirect by role.
========================================================= */

const loginForm = document.querySelector("#loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", handleLoginSubmit);
}


async function handleLoginSubmit(event) {
    event.preventDefault();

    const emailInput = document.querySelector("#loginEmail");
    const passwordInput = document.querySelector("#loginPassword");
    const rememberMeInput = document.querySelector("#rememberMe");
    const message = document.querySelector("#loginMessage");

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const rememberMe = rememberMeInput ? rememberMeInput.checked : false;

    if (!isValidEmail(email)) {
        showMessage(message, "error", "יש להזין אימייל תקין.");
        return;
    }

    if (password === "") {
        showMessage(message, "error", "יש להזין סיסמה.");
        return;
    }

    const matchedUser = await findMatchingUserByEmail(email, password);

    if (!matchedUser) {
        showMessage(message, "error", "אימייל או סיסמה לא נכונים.");
        return;
    }

    saveCurrentUser(matchedUser);

    if (rememberMe) {
        localStorage.setItem("dlsRememberEmail", email);
    } else {
        localStorage.removeItem("dlsRememberEmail");
    }

    if (matchedUser.effect) {
        localStorage.setItem("dlsPendingEffect", matchedUser.effect);
    }

    showMessage(message, "success", "ההתחברות הצליחה. מעביר אותך...");

    const redirectUrl = getRedirectByUser(matchedUser);

    setTimeout(function () {
        window.location.href = redirectUrl;
    }, 600);
}


/* =========================================================
   8. Live Email Indicator
   Purpose:
   Validate email fields visually while typing.
========================================================= */

const emailInputs = document.querySelectorAll("[data-email-input]");

emailInputs.forEach(function (input) {
    const field = input.closest(".field");
    const statusElement = field.querySelector("[data-email-status]");
    const hintElement = field.querySelector("[data-email-hint]");

    input.addEventListener("input", function () {
        updateEmailIndicator(input, statusElement, hintElement);
    });

    input.addEventListener("blur", function () {
        updateEmailIndicator(input, statusElement, hintElement);
    });
});


/* =========================================================
   9. Live Password Indicator
   Purpose:
   Validate register password while typing.
========================================================= */

const passwordInput = document.querySelector("[data-password-input]");
const passwordHint = document.querySelector("#passwordHint");

if (passwordInput && passwordHint) {
    passwordInput.addEventListener("input", function () {
        const password = passwordInput.value;

        if (password === "") {
            passwordHint.className = "field-hint";
            passwordHint.textContent =
                "נדרש: אות קטנה, אות גדולה, מספר ולפחות 6 תווים.";
            return;
        }

        if (isValidPassword(password)) {
            passwordHint.className = "field-hint valid";
            passwordHint.textContent = "הסיסמה נראית תקינה.";
            return;
        }

        passwordHint.className = "field-hint invalid";
        passwordHint.textContent =
            "חסר משהו: אות קטנה, אות גדולה, מספר או 6 תווים.";
    });
}


/* =========================================================
   10. Topbar Date And Clock
   Purpose:
   Update clock and date in login/register topbar.
========================================================= */

const topClock = document.querySelector("#topClock");
const topDate = document.querySelector("#topDate");

function updateTopDateTime() {
    const now = new Date();

    if (topClock) {
        topClock.textContent = now.toLocaleTimeString("he-IL", {
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    if (topDate) {
        topDate.textContent = now.toLocaleDateString("he-IL", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }
}

updateTopDateTime();
setInterval(updateTopDateTime, 1000);


/* =========================================================
   11. Debug Helpers
   Purpose:
   Inspect auth state from DevTools during development.
========================================================= */

window.dlsAuthDebug = {
    loadDemoUsersFromJson,
    loadRegisteredUsersFromStorage,
    loadAllUsers,
    saveRegisteredUsersToStorage
};