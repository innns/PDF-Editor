You are a senior full-stack architect and principal engineer.

Build a production-style, self-hosted, browser-based PDF editor similar in product direction to Adobe Acrobat, with a Python backend and a modern frontend.

Your job is to generate the complete codebase, architecture, setup instructions, and implementation details.

Do not give a shallow demo. Build a realistic MVP with clean architecture, modular code, and an extensible design.

==================================================
1. PRODUCT GOAL
==================================================

Create a web PDF editor that supports:

1. PDF viewing in browser
2. Text annotations
3. Highlight annotations
4. Rectangle / shape drawing
5. Freehand drawing
6. Signature insertion
7. Image insertion
8. Delete pages
9. Rotate pages
10. Reorder pages
11. Merge multiple PDFs
12. Split PDF
13. Export final edited PDF
14. Undo / redo on frontend annotation operations
15. Zoom and pan
16. Multi-page thumbnail sidebar
17. Save and reload editing session

Important:
This is primarily a web PDF editor based on:
- PDF rendering in browser
- annotation overlay editing
- backend PDF processing for final export

Do NOT attempt full direct low-level PDF text object editing like native Acrobat desktop internals.
Instead, use the robust architecture:
PDF viewer + canvas annotation layer + backend export compositor

==================================================
2. ENGINEERING REQUIREMENTS
==================================================

The generated project must be:

- runnable locally
- well-structured
- modular
- typed where appropriate
- documented
- reasonably production-like
- easy to extend

Avoid toy code.
Avoid putting all logic in one file.
Avoid vague placeholders unless absolutely necessary.

Where implementation is large, provide actual working code, not pseudo-code.

==================================================
3. TECH STACK
==================================================

Backend:
- Python 3.11+
- FastAPI
- Uvicorn
- Pydantic
- pypdf
- PyMuPDF (fitz) for rendering/compositing if needed
- Pillow
- python-multipart

Frontend:
- React
- Vite
- TailwindCSS
- pdfjs-dist for PDF rendering
- Konva.js or Fabric.js for annotation layer
- Zustand or Redux Toolkit for state management
- React Query or simple fetch wrapper for API calls

Storage:
- local filesystem storage
- uploaded PDFs stored by UUID
- annotation/session data stored as JSON
- exported PDFs stored in output directory

Why this design:
- PDF.js is strong for in-browser viewing
- Konva/Fabric is suitable for overlay annotation editing
- pypdf is good for merge/split/reorder/delete
- PyMuPDF can help render pages or overlay visual edits during export

==================================================
4. ARCHITECTURE
==================================================

Use this high-level architecture:

Browser
  -> React UI
  -> PDF.js rendering layer
  -> Annotation canvas overlay
  -> FastAPI REST API
  -> PDF/document service
  -> session/annotation persistence
  -> export/composition pipeline
  -> filesystem storage

Design the application in a way that makes future features possible:
- collaboration
- OCR
- search
- form filling
- auth
- cloud storage

==================================================
5. CORE DESIGN PRINCIPLES
==================================================

1. Keep original PDFs immutable
   - never overwrite original upload
   - store edits separately

2. Store annotations separately as JSON
   - per page
   - normalized coordinates when reasonable
   - support later replay/export

3. Final PDF export is generated from:
   - original PDF
   - page operations
   - annotation overlay data

4. Frontend editing is overlay-based
   - do not mutate PDF binary in browser

5. Make API contracts explicit and stable

==================================================
6. PROJECT STRUCTURE
==================================================

Generate the project with a clean monorepo-style structure like this:

pdf-editor/
  backend/
    app/
      main.py
      config.py
      models/
        api_models.py
        domain_models.py
      routes/
        health.py
        files.py
        documents.py
        annotations.py
        export.py
      services/
        file_service.py
        pdf_service.py
        annotation_service.py
        export_service.py
        thumbnail_service.py
      utils/
        ids.py
        paths.py
        exceptions.py
      storage/
        uploads/
        sessions/
        exports/
        thumbnails/
    requirements.txt
    README.md

  frontend/
    src/
      main.jsx
      App.jsx
      pages/
        EditorPage.jsx
      components/
        TopToolbar.jsx
        LeftSidebar.jsx
        ThumbnailList.jsx
        PDFCanvasView.jsx
        AnnotationToolbar.jsx
        ExportDialog.jsx
        UploadPanel.jsx
      features/
        editor/
          editorStore.js
          annotationUtils.js
          pageOpsUtils.js
          historyUtils.js
      services/
        api.js
      hooks/
        usePdfDocument.js
        useAnnotations.js
        useZoomPan.js
      styles/
        index.css
    public/
    package.json
    vite.config.js
    tailwind.config.js
    README.md

  docker-compose.yml
  Dockerfile.backend
  Dockerfile.frontend
  README.md

==================================================
7. BACKEND API REQUIREMENTS
==================================================

Implement these endpoints.

Health:
- GET /api/health

Upload:
- POST /api/files/upload
  - accepts one or more PDF files
  - returns document ids and metadata

Document retrieval:
- GET /api/documents/{document_id}/metadata
- GET /api/documents/{document_id}/file
- GET /api/documents/{document_id}/thumbnails
- GET /api/documents/{document_id}/session

Annotations/session:
- POST /api/documents/{document_id}/session
  - save entire editing session
- PATCH /api/documents/{document_id}/session
  - partial update
- GET /api/documents/{document_id}/annotations

Page operations:
- POST /api/documents/{document_id}/pages/reorder
- POST /api/documents/{document_id}/pages/delete
- POST /api/documents/{document_id}/pages/rotate
- POST /api/documents/{document_id}/pages/split

Merge:
- POST /api/documents/merge
  - merge multiple uploaded documents into a new document

Export:
- POST /api/documents/{document_id}/export
  - returns exported file metadata and downloadable URL

Downloads:
- GET /api/exports/{export_id}/download

Use proper request and response models with Pydantic.

==================================================
8. DATA MODELS
==================================================

Design explicit models.

Document metadata:
- id
- original_filename
- stored_filename
- page_count
- created_at
- file_size

Editing session:
- document_id
- zoom state optional
- page_order
- deleted_pages
- rotated_pages
- annotations by page
- history snapshot optional
- version
- updated_at

Annotation types:
- text
- highlight
- rectangle
- freehand
- signature
- image

Each annotation should have fields like:
- id
- type
- page
- x
- y
- width
- height
- rotation
- color
- strokeWidth
- opacity
- text
- fontSize
- fontFamily
- imageRef
- path data for freehand
- createdAt
- updatedAt

Use normalized coordinates where useful so annotations remain stable across zoom levels.

==================================================
9. EXPORT PIPELINE
==================================================

Implement a robust export pipeline.

Export steps:
1. Load original PDF
2. Apply page reorder/delete/rotate transformations
3. For each page, apply annotations
4. Render final composed PDF
5. Save exported file
6. Return downloadable URL

Implementation guidance:
- use pypdf for page structural operations
- use PyMuPDF and/or reportlab style overlay generation if needed for compositing
- signatures/images should be placed onto target pages
- text annotations should render into final PDF
- highlights should render as translucent overlays
- freehand strokes should render as vector-like lines if practical, otherwise raster overlay is acceptable for MVP

If direct vector export becomes too complex, a practical acceptable approach is:
- render page
- composite overlay
- rebuild/export page PDF
But prefer preserving PDF quality when feasible.

Explain tradeoffs in comments.

==================================================
10. FRONTEND REQUIREMENTS
==================================================

Build a polished editor UI with:

Main layout:
- top toolbar
- left sidebar with page thumbnails
- center document viewer
- overlay annotation layer
- optional right side properties panel

Toolbar actions:
- upload PDF
- select tool
- text tool
- highlight tool
- rectangle tool
- freehand tool
- signature tool
- image tool
- delete page
- rotate page
- reorder pages
- merge PDFs
- split PDF
- undo
- redo
- zoom in/out
- fit width
- export

Viewer:
- render pages using PDF.js
- each page has a canvas render and annotation overlay
- support lazy rendering for performance
- support scrolling through many pages

Annotation behavior:
- selectable objects
- draggable/resizable where applicable
- maintain per-page object lists
- sync with state store
- save session to backend

Sidebar:
- page thumbnails
- drag-and-drop reorder
- page delete control
- current page indication

State management:
- use Zustand or Redux Toolkit
- maintain active tool
- selected annotation
- page operations
- session dirty state
- undo/redo stack

==================================================
11. UX DETAILS
==================================================

The UI should feel like a serious editor, not a classroom project.

Requirements:
- clean minimal layout
- Tailwind styling
- keyboard shortcuts where practical:
  - Delete for selected annotation
  - Ctrl/Cmd+Z undo
  - Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y redo
- visible active tool state
- loading indicators
- error messages
- export progress indicator
- basic dark mode support

==================================================
12. PERFORMANCE REQUIREMENTS
==================================================

The app should handle:
- PDFs up to around 200 pages
- multiple annotations per page
- large files within reasonable local dev limits

Use:
- lazy page rendering
- thumbnail pre-generation backend if useful
- debounced autosave for session data
- avoid re-rendering all pages on every small state change

==================================================
13. SECURITY / ROBUSTNESS
==================================================

Implement reasonable protections:
- only allow PDF uploads
- file size limits
- UUID-based filenames
- avoid path traversal
- validate incoming JSON
- graceful error handling
- CORS config for local dev
- no dangerous eval-like logic

==================================================
14. CODE QUALITY STANDARDS
==================================================

The generated code must:
- be split into meaningful files
- include comments for key architectural decisions
- avoid monolithic files unless unavoidable
- avoid magic constants
- include reusable utility functions
- include type-safe API models
- include clear README instructions

Do not produce fake placeholder comments like:
"TODO: implement later"
unless absolutely necessary.
Prefer implementing the feature.

==================================================
15. DELIVERABLES
==================================================

Generate all of the following:

1. Full backend code
2. Full frontend code
3. requirements.txt
4. package.json
5. Tailwind/Vite config
6. Dockerfile.backend
7. Dockerfile.frontend
8. docker-compose.yml
9. top-level README.md
10. setup and run instructions
11. API usage examples
12. explanation of architectural decisions

==================================================
16. README REQUIREMENTS
==================================================

The README must include:
- project overview
- feature list
- architecture summary
- folder structure
- local setup
- backend run command
- frontend run command
- docker run instructions
- export pipeline explanation
- limitations
- future improvements

==================================================
17. IMPLEMENTATION PRIORITIES
==================================================

Prioritize correctness and runnable code in this order:

Priority 1:
- upload PDF
- view PDF in browser
- annotations overlay
- save/load session
- delete/reorder/rotate pages
- export edited PDF

Priority 2:
- merge/split
- signature/image insertion
- undo/redo
- thumbnails

Priority 3:
- dark mode polish
- better property panel
- extra keyboard shortcuts

==================================================
18. IMPORTANT CONSTRAINTS
==================================================

Do not use a database for MVP.
Use filesystem + JSON only.

Do not build authentication.

Do not build collaboration yet.

Do not overcomplicate deployment.

Do not skip actual implementation by replacing core logic with pseudo-code.

==================================================
19. OUTPUT FORMAT
==================================================

Output your answer as:

1. Brief architecture summary
2. Full project tree
3. Backend code files
4. Frontend code files
5. Config files
6. Docker files
7. README

For each file, clearly label it like:

=== backend/app/main.py ===
<code>

=== frontend/src/App.jsx ===
<code>

Make the code internally consistent across files.

==================================================
20. OPTIONAL ENHANCEMENTS IF TIME ALLOWS
==================================================

If feasible, also include:
- autosave
- thumbnail caching
- basic signature pad
- drag-and-drop multi-file merge upload
- image stamping
- per-annotation style editing
- simple test examples for backend service functions

==================================================
21. FINAL QUALITY BAR
==================================================

Act like you are building the initial codebase for a real internal product team.

The result should be something a developer can:
- copy into files
- install dependencies
- run locally
- use as a serious starting point for a PDF editor product

Now generate the full implementation.