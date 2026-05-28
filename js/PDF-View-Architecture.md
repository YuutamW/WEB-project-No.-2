 ```html
 <script src="https://cdnjs.cloudflare.com/ajax/libs/pfs.js/4.10.38/pdf.min.mjs" type="module"></script> 
```

## PDF.js -
- PDF Load
- Render
- move between pages
- get size of Page

```js
pdfjsLib.getDocument(...)
pdf.getPage(pageNumber)
page.render(...)
```
---

## Canvas API -
- Pen
- Eraser
- Laser visual
- paint strokes

```css
{
    type: "pen",
    color: "#ff0000",
    size: 4,
    points: [
        { x: 0.12, y: 0.44 },
        { x: 0.13, y: 0.45 }
    ]
}
``` 

---

## Point Events -

```js
pointerdown
pointermove
pointerup
```
### works with Touch / Tablet / Pen

---

## File API -

- Upload PDF
- Upload Image
- Read Local File

---

## Storage -

- localStorage (at furst)
- For a lot of images and annotations -> prefer ```IndexedDB```
- for backend : Server DB / JSON file / Firebase / SQLite etc...

- save relative pos (for scale) ```x: 0.42 , y: 0.31```

```js
normalizedX = mouseX / canvasWidth
normalizedY = mouseY / canvasHeight
```

### when repaint:

```js
screenX = normalizedX * canvasWidth
screenY = normalizedY * canvasHeight
```
### saves Annotation at the right place even when rescale page



---

## JSON Structure

```js
const presentationData = {
    fileName: "lecture.pdf",
    currentPage: 1,

    pages: {
        1: {
            annotations: [
                {
                    id: "ann_001",
                    type: "pen",
                    color: "#ff0000",
                    size: 4,
                    points: [
                        { x: 0.12, y: 0.44 },
                        { x: 0.13, y: 0.45 }
                    ]
                }
            ],

            objects: [
                {
                    id: "txt_001",
                    type: "text",
                    x: 0.35,
                    y: 0.22,
                    text: "Important point"
                },
                {
                    id: "img_001",
                    type: "image",
                    x: 0.5,
                    y: 0.5,
                    width: 0.2,
                    height: 0.15,
                    src: "blob-or-base64-later"
                }
            ],

            questions: [
                {
                    id: "q_001",
                    x: 0.8,
                    y: 0.4,
                    text: "Can you explain this?",
                    createdAt: "2026-05-28T..."
                }
            ]
        },

        2: {
            annotations: [],
            objects: [],
            questions: []
        }
    }
};
```

### Go between Pages - Will work like this :

from page ```[i]``` to page ```[i + 1]``` - the order is:
- Save Annotations of Page ```[i]```
- Clean Canvas
- Render Page ```[i + 1]```
- Repaint Pages


### Functionality:
```js
goToPage(pageNumber) {
    saveCurrentPageState();

    currentPage = pageNumber;

    renderPdfPage(currentPage);

    redrawAnnotationsForPage(currentPage);
    redrawDomObjectsForPage(currentPage);
}
```

---

### Key Point in Rendering PowerPoint :
Browser alone cannot run libreOffice service of conversion ppt/pptx to pdf.
must server side

```css
Node.js / Python / backend
+
LibreOffice installed
```

###  in Our Project -

```cs
if PDF -> Render
if PPT/PPTX -> show message : "needs server conversion"
```