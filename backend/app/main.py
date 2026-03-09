from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.routes.annotations import router as annotations_router
from app.routes.documents import router as documents_router
from app.routes.export import router as export_router
from app.routes.files import router as files_router
from app.routes.health import router as health_router

settings = get_settings()
app = FastAPI(title=settings.app_name, debug=settings.debug)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix=settings.api_prefix)
app.include_router(files_router, prefix=settings.api_prefix)
app.include_router(documents_router, prefix=settings.api_prefix)
app.include_router(annotations_router, prefix=settings.api_prefix)
app.include_router(export_router, prefix=settings.api_prefix)

app.mount("/storage/uploads", StaticFiles(directory=settings.uploads_dir), name="uploads")
app.mount("/storage/thumbnails", StaticFiles(directory=settings.thumbnails_dir), name="thumbnails")
app.mount("/storage/exports", StaticFiles(directory=settings.exports_dir), name="exports")
