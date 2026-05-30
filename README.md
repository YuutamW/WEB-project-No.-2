<p align="center">
  <img src="/assets/dls-logo.svg" alt="DLS Logo" width="120" />
</p>

<h1 align="center">🖊️ DLS – Dynamic Lecture System 👨🏻‍🏫</h1>

<p align="center">
  Frontend prototype for a Dynamic Lecture System built with
  <b>Vanilla HTML</b>, <b>CSS</b>, <b>JavaScript</b> and <b>JSON</b>.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/HTML-Vanilla-orange" alt="HTML Vanilla" />
  <img src="https://img.shields.io/badge/CSS-Custom-purple" alt="Custom CSS" />
  <img src="https://img.shields.io/badge/JavaScript-Vanilla-yellow" alt="Vanilla JavaScript" />
  <img src="https://img.shields.io/badge/Status-Prototype-blue" alt="Prototype Status" />
</p>

---

## 📌 Overview

DLS is a frontend-only prototype for a Dynamic Lecture System.

The current prototype lets a lecturer log in, open a dashboard, upload a PDF presentation, navigate between pages, and use a teacher control toolbar mockup for future presentation tools.

The project is built with client-side technologies only.

---

## 🧭 Current Pages

| Page | Purpose |
|---|---|
| `login.html` | Email/password login page |
| `register.html` | Registration form with validation |
| `dashboard.html` | Lecturer dashboard prototype |
| `presentetion.html` | PDF presentation viewer with teacher controls |
| `easteregg.html` | Hidden demo page for future easter eggs |

> Note: the presentation page file is currently named `presentetion.html` in the project.

---

## ✨ Current Features

- Purple/orange DLS visual theme
- Login and registration validation
- Demo users loaded from `data/sample-users.json`
- Registered users saved locally with `localStorage`
- Lecturer login redirects to the dashboard
- Dashboard prototype with clock, calendar, quick actions and recent lectures
- PDF upload and rendering with PDF.js
- PDF page navigation
- Relative click positions for future Q&A / annotation layer
- Teacher toolbar mockup:
  - Stop
  - Pen
  - Eraser
  - Text
  - Image
  - Laser
  - Switch Presentation
  - Settings

---

## 🔐 Demo Login

Use this demo lecturer account:

```txt
Email: Lecturer@shenkar.com
Password: Lecturer1
```

---

## 🗂️ User Storage

This project is frontend-only.

Fixed demo users are stored in:

```txt
data/sample-users.json
```

Users registered through `register.html` are saved locally in the browser:

```txt
localStorage.dlsRegisteredUsers
```

The current logged-in user is saved as:

```txt
localStorage.dlsCurrentUser
```

> ⚠️ This is only for proof of concept.  
> A real production system must use a backend and secure password hashing.

---

## ▶️ Run Locally

Use **Live Server** in VS Code.

Do not open the files directly from the file system because `fetch()` and PDF.js need a local server.

Recommended flow:

```txt
Right click login.html
→ Open with Live Server
```

---


## 🖼️ Presentation Viewer Architecture

The presentation page uses a layered structure:

```txt
slideWrapper
│
├── PDF Canvas Layer
├── Annotation Canvas Layer
├── DOM Layer
└── Laser Pointer Layer
```

This keeps the original PDF separate from annotations, question points, images and text objects.

---

## 🧠 Annotation Data Idea

Annotations and question positions should be saved as relative positions, not fixed pixels.

Example:

```js
{
  page: 2,
  x: 0.42,
  y: 0.31
}
```

This keeps the annotation in the correct place even when the PDF changes size.

---

## 📄 PDF Support

Current browser-only support:

```txt
[⬆️🔃] PDF upload              
[🎦⚙️] PDF render in browser   
[🧭↔️] PDF page navigation     
```

PowerPoint conversion is not supported in the browser-only prototype.

PPT/PPTX conversion would require:

```txt
Backend server        [🔙🤚🏻🤵🏻🆚]
+
LibreOffice installed [🪁]
+
PPT/PPTX → PDF conversion service 
```

For this prototype:

```txt
PDF → Render in browser
PPT/PPTX → Show “server conversion required” message
```

---
### 🙋🏻‍♂️ Question Injection ❔

### current Flow:
```cs
1. [Shift + Click] on annotrationCanvas
-----------------------------------------------------
2. `presentation-manager.js` Identifies the Click
-----------------------------------------------------
3. Asks "pdfViewerManager" what "currentPage"
-----------------------------------------------------
4. Calculates relativ X/Y on current Page
-----------------------------------------------------
5. Creates `QuestionObject`
-----------------------------------------------------
6. Saves the obj to `presentationData` && `localStorage`
-----------------------------------------------------
7. Later can reaad Data from Dashboard
-----------------------------------------------------
```
#### Question saved as Info Object : 
#### helps us in presenting the info as a ```"Dot"``` ```🔵``` or open as ```popup```
#### , set as ```answered``` , count on ```dashboard``` and use in ```heatmap```.

---

## 🚧 Next Steps

- Add real pen annotation saving
- Redraw annotations per PDF page
- Add Q&A markers on the slide
- Improve and simplify the dashboard UI
- Add easter egg effects
- Prepare final submission screenshots
- Improve project documentation before final delivery

---

## 📝 Notes

This project is a proof-of-concept frontend prototype.

It is not a production authentication system and should not be used with real passwords or sensitive data.
