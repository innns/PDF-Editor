from functools import lru_cache

from app.services.annotation_service import AnnotationService
from app.services.export_service import ExportService
from app.services.file_service import FileService
from app.services.pdf_service import PDFService
from app.services.thumbnail_service import ThumbnailService


@lru_cache(maxsize=1)
def get_file_service() -> FileService:
    return FileService()


@lru_cache(maxsize=1)
def get_pdf_service() -> PDFService:
    return PDFService(get_file_service())


@lru_cache(maxsize=1)
def get_annotation_service() -> AnnotationService:
    return AnnotationService(get_pdf_service())


@lru_cache(maxsize=1)
def get_thumbnail_service() -> ThumbnailService:
    return ThumbnailService(get_file_service())


@lru_cache(maxsize=1)
def get_export_service() -> ExportService:
    return ExportService(get_file_service(), get_pdf_service(), get_annotation_service())
