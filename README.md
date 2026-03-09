# PDF Editor

Browser-based PDF editor MVP built as a local-first monorepo with a FastAPI backend and a React/Vite frontend. The editor renders PDFs in the browser, stores editing sessions as JSON, and produces exported PDFs by replaying saved page operations and annotations on the backend.

## Features

- PDF upload and browser viewing
- Text, highlight, rectangle, freehand, signature, and image annotations
- Page delete, rotate, and thumbnail-based reorder
- Merge uploaded PDFs into a new document
- Split selected pages into new documents
- Session save and reload using filesystem JSON storage
- Backend-generated thumbnails
- Flattened export with a real download endpoint
- Frontend undo and redo for annotation and page-order state
- Zoom controls and fit-width mode
- Dark mode toggle

## Architecture summary

### Backend

- FastAPI for the REST API and file serving
- `pypdf` for structural page operations such as merge, split, reorder, delete, and rotate
- PyMuPDF for thumbnail rendering and flattening annotations into the exported PDF
- Filesystem-only persistence for uploads, sessions, thumbnails, and exports

### Frontend

- React + Vite application
- PDF.js for in-browser PDF rendering
- React Konva for the annotation overlay layer
- Zustand for editor state, undo/redo history, and tool configuration
- Plain fetch API wrapper bound to the backend routes

### Export pipeline

1. Load the immutable original PDF.
2. Apply session page order, deletion, and rotation with `pypdf`.
3. Reopen the transformed PDF with PyMuPDF.
4. Paint saved annotations page-by-page onto the transformed document.
5. Save the flattened PDF to `backend/app/storage/exports`.
6. Return an export payload with a real `downloadUrl` and absolute `storagePath`.

This keeps the original upload untouched and makes session replay explicit and debuggable.

## Folder structure

```text
.
├── backend
│   ├── README.md
│   ├── app
│   │   ├── config.py
│   │   ├── main.py
│   │   ├── models
│   │   ├── routes
│   │   ├── services
│   │   ├── storage
│   │   └── utils
│   └── requirements.txt
├── frontend
│   ├── README.md
│   ├── index.html
│   ├── nginx.conf
│   ├── package.json
│   ├── postcss.config.js
│   ├── src
│   ├── styles
│   ├── tailwind.config.js
│   └── vite.config.js
├── Dockerfile.backend
├── Dockerfile.frontend
├── docker-compose.yml
├── prompts.md
└── pyproject.toml
```

## Local setup

### Prerequisites

- Python 3.11+
- `uv`
- Node.js and `npm`
- If Node is managed with `nvm`, load it before running frontend commands:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion"
```

### Backend with `uv`

```bash
uv sync
uv run uvicorn --app-dir backend app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend uses the root `pyproject.toml` and `backend/requirements.txt`. Storage is created automatically under `backend/app/storage`.

### Frontend

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

The Vite dev server runs on `http://127.0.0.1:5173` and proxies `/api` and `/storage` to the backend on `http://127.0.0.1:8000`.

### Production build check

```bash
cd frontend
npm run build
```

This build path has been verified locally.

### End-to-end smoke tests

```bash
cd frontend
npx playwright install chromium
npm run test:e2e
```

The Playwright setup will:

1. generate deterministic PDF fixtures with `uv run python frontend/scripts/generate_e2e_fixtures.py`
2. start the backend on `127.0.0.1:8000`
3. start the Vite dev server on `127.0.0.1:5173`
4. run browser-based smoke tests for upload, rotate/delete/undo, text and highlight persistence, merge, split, thumbnail drag-reorder, export, and browser download
5. validate exported PDF content for signature text, text placement, image embeds, drawing overlays, and dragged/transformed rectangle and image geometry

If you want to watch the tests in a visible browser:

```bash
cd frontend
npm run test:e2e:headed
```

### Verified local dev flow

The following local flow has been exercised successfully:

1. `uv sync`
2. `uv run uvicorn --app-dir backend app.main:app --reload --host 127.0.0.1 --port 8000`
3. `cd frontend && npm install`
4. `cd frontend && npm run dev -- --host 127.0.0.1 --port 5173`
5. `GET http://127.0.0.1:5173/api/health`
6. Upload a PDF through `POST /api/files/upload`
7. Fetch metadata, session, thumbnails, PDF file, and export download
8. Run Playwright smoke tests successfully

## API summary

### Health

```bash
curl http://localhost:8000/api/health
```

### Upload PDFs

```bash
curl -X POST http://localhost:8000/api/files/upload \
  -F "files=@/absolute/path/sample.pdf" \
  -F "files=@/absolute/path/appendix.pdf"
```

### Load metadata, file, thumbnails, and session

```bash
curl http://localhost:8000/api/documents/<document_id>/metadata
curl -OJ http://localhost:8000/api/documents/<document_id>/file
curl http://localhost:8000/api/documents/<document_id>/thumbnails
curl http://localhost:8000/api/documents/<document_id>/session
```

### Save session

```bash
curl -X POST http://localhost:8000/api/documents/<document_id>/session \
  -H "Content-Type: application/json" \
  -d @session.json
```

### Reorder pages

```bash
curl -X POST http://localhost:8000/api/documents/<document_id>/pages/reorder \
  -H "Content-Type: application/json" \
  -d '{"pageOrder":[2,0,1]}'
```

### Rotate one page

```bash
curl -X POST http://localhost:8000/api/documents/<document_id>/pages/rotate \
  -H "Content-Type: application/json" \
  -d '{"page":0,"degrees":90}'
```

### Export

```bash
curl -X POST http://localhost:8000/api/documents/<document_id>/export
curl -OJ http://localhost:8000/api/exports/<export_id>/download
```

### Merge

```bash
curl -X POST http://localhost:8000/api/documents/merge \
  -H "Content-Type: application/json" \
  -d '{"documentIds":["<doc_a>","<doc_b>"]}'
```

### Split

```bash
curl -X POST http://localhost:8000/api/documents/<document_id>/pages/split \
  -H "Content-Type: application/json" \
  -d '{"pages":[0,2]}'
```

## Docker

```bash
docker compose up --build
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`

## Key implementation details

- Original uploads are immutable and never overwritten.
- Session state is stored per document as JSON and contains page order, deleted pages, rotated pages, and annotations.
- Coordinates are stored in normalized form so the same session remains stable across zoom levels.
- The frontend loads the PDF directly from `/api/documents/{document_id}/file`, which is the same route used in metadata and viewer state.
- Upload, merge, and split responses all include `fileUrl` so `DocumentMetadata` is consistent across the API.
- Export responses include both a `downloadUrl` and an absolute `storagePath` so the client has a real file target.
- Thumbnail generation is cached on disk and reused unless regenerated.
- The frontend will resync the session from the backend if a page reorder, delete, or rotate request fails.
- The merge action now includes the currently open document plus any newly uploaded PDFs, matching user expectation.

## Debug notes

- `GET /api/health` is implemented. A `HEAD` request to that route will return `405 Method Not Allowed`, which is expected with the current route definition.
- Vite proxy paths `/api` and `/storage` have been verified against the running backend.
- The frontend production build currently succeeds, but the bundle is large because PDF.js is included in the main build.
- A Playwright smoke suite has been verified locally: 11 tests passed covering landing page, upload/edit/export, text/highlight/signature persistence, merge, split, thumbnail drag-reorder, browser download, exported PDF content validation, and dragged/transformed rectangle and image export geometry.
- The current `highlight` tool is an area-based translucent overlay, not glyph-aware text selection.

## Limitations

- Signature insertion uses typed signatures rather than a handwritten pad.
- Annotation styling is intentionally lightweight and does not expose a full properties inspector yet.
- Frontend page operations update local state optimistically and then resync from the server if the write fails.
- Session JSON writes use atomic file replacement to avoid autosave/read races during concurrent interactions.
- Exported annotations are flattened into the document and are not preserved as editable PDF annotations.
- No authentication, collaboration, OCR, or form editing is included in this MVP.
- The Playwright suite is intentionally a smoke test, not a full behavioral regression suite.
- Annotation coverage currently includes text, highlight, rectangle, freehand, and image flows, but not every tool permutation.

## Future improvements

- Dedicated signature pad and asset upload endpoint
- Virtualized page rendering for very large PDFs
- Rich annotation inspector with alignment and layering controls
- Search, OCR, form filling, and text extraction tools
- Background export jobs with progress polling
- Code-splitting to reduce the main frontend bundle size
- Expand end-to-end coverage for signature/image transform edits, multi-page export assertions, and glyph-aware text highlighting if that feature is added
