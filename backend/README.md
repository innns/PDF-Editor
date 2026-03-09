# Backend

FastAPI backend for the PDF editor. It stores original uploads immutably, keeps session data as JSON, and generates flattened exports from the original PDF plus saved page operations and annotations.

## Run with uv

```bash
uv sync
uv run uvicorn --app-dir backend app.main:app --reload --host 0.0.0.0 --port 8000
```

## Storage layout

- `backend/app/storage/uploads`: original PDFs
- `backend/app/storage/sessions`: per-document metadata and editing session JSON
- `backend/app/storage/thumbnails`: cached page thumbnails
- `backend/app/storage/exports`: generated PDFs
