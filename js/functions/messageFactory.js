
export function showMessage(element, type, text) {
    if (!element) {
        return;
    }

    element.className = `form-message ${type}`;
    element.textContent = text;
}


export function updateEmailIndicator(input, statusElement, hintElement) {
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

