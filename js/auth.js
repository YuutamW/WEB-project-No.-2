/* =========================================================
   DLS AUTH VALIDATION — V2
   ---------------------------------------------------------
   Handles basic client-side validation for:
   - register.html
   - login.html

   New in V2:
   - Live email structure indicator
   - Clock/date widget for the login page
   ========================================================= */

/* #region Helpers */

/**
 * Checks if an email has a normal email structure:
 * text + @ + domain + dot + ending.
 *
 * Example valid structure:
 * name@example.com
 */
function isValidEmail(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

/**
 * Checks if a password is strong enough for our frontend demo.
 *
 * Current rule:
 * - At least 6 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one number
 *
 * This is still only frontend validation.
 * Real systems must also validate passwords on the server.
 */
function isValidPassword(password) {
  const hasMinLength = password.length >= 6;
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return hasMinLength && hasLowercase && hasUppercase && hasNumber;
}

/**
 * Shows a message inside the given message element.
 */
function showMessage(element, type, text) {
  element.className = `form-message ${type}`;
  element.textContent = text;
}

/**
 * Updates a small visual indicator near an email input.
 */
function updateEmailIndicator(input, statusElement, hintElement) {
  const value = input.value.trim();

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

/* #endregion */

/* #region Live Email Indicators */

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

/* #endregion */

/* #region Register Validation */

const registerForm = document.querySelector("#registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const firstName = document.querySelector("#firstName").value.trim();
    const lastName = document.querySelector("#lastName").value.trim();
    const email = document.querySelector("#email").value.trim();
    const role = document.querySelector("#role").value;
    const password = document.querySelector("#password").value;
    const terms = document.querySelector("#terms").checked;
    const message = document.querySelector("#registerMessage");

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
      showMessage(message, "error", "הסיסמה חייבת להכיל לפחות 6 תווים, כולל אות קטנה, גדולה ומספר.");
      return;
    }

    if (!terms) {
      showMessage(message, "error", "יש לאשר את תנאי השימוש.");
      return;
    }

    showMessage(message, "success", "ההרשמה הצליחה לדוגמה. בשלב זה אין שמירה לשרת.");
    registerForm.reset();
  });
}

/* #endregion */

/* #region Live Password Indicator */

const passwordInput = document.querySelector("[data-password-input]");
const passwordHint = document.querySelector("#passwordHint");

if (passwordInput && passwordHint) {
  passwordInput.addEventListener("input", function () {
    const password = passwordInput.value;

    if (password === "") {
      passwordHint.className = "field-hint";
      passwordHint.textContent = "נדרש: אות קטנה, אות גדולה, מספר ולפחות 6 תווים.";
      return;
    }

    if (isValidPassword(password)) {
      passwordHint.className = "field-hint valid";
      passwordHint.textContent = "הסיסמה נראית תקינה.";
      return;
    }

    passwordHint.className = "field-hint invalid";
    passwordHint.textContent = "חסר משהו: אות קטנה, אות גדולה, מספר או 6 תווים.";
  });
}

/* #endregion */

/* #region Login Validation */

const loginForm = document.querySelector("#loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const email = document.querySelector("#loginEmail").value.trim();
    const password = document.querySelector("#loginPassword").value;
    const message = document.querySelector("#loginMessage");

    if (!isValidEmail(email)) {
      showMessage(message, "error", "יש להזין אימייל תקין.");
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

    showMessage(message, "success", "ההתחברות הצליחה לדוגמה. בשלב זה אין חיבור אמיתי לשרת.");
    loginForm.reset();
  });
}

/* #endregion */

/* #region Login Clock Widget */

// const clockTime = document.querySelector("#clockTime");
// const clockDate = document.querySelector("#clockDate");

// function updateClock() {
//   if (!clockTime || !clockDate) {
//     return;
//   }

//   const now = new Date();

//   clockTime.textContent = now.toLocaleTimeString("he-IL", {
//     hour: "2-digit",
//     minute: "2-digit"
//   });

//   clockDate.textContent = now.toLocaleDateString("he-IL", {
//     weekday: "long",
//     year: "numeric",
//     month: "long",
//     day: "numeric"
//   });
// }

// updateClock();
// setInterval(updateClock, 1000);

/* #endregion */


/* #region Topbar Date And Clock */

/*
 * Updates the small date/time text in the topbar.
 * Note: We use the same Date object for both time and date to ensure they are always in sync.
 * This keeps the code simple and avoids repeating new Date().
 
--new Date()
  gets the current browser date/time.
--toLocaleTimeString("he-IL")
  formats the time for Hebrew/Israel.

--toLocaleDateString("he-IL")
  formats the date and day in Hebrew.

--setInterval(..., 1000)
  updates it every second.
 */
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

/* #endregion */
updateTopClock();
setInterval(updateTopClock, 1000);
/* #endregion */
