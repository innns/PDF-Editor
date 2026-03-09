from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse

from app.models.api_models import ExportResponse
from app.services.export_service import ExportService
from app.services.file_service import FileService
from app.state import get_export_service, get_file_service

router = APIRouter(tags=["export"])


@router.post("/documents/{document_id}/export", response_model=ExportResponse)
def export_document(
    document_id: str,
    file_service: FileService = Depends(get_file_service),
    export_service: ExportService = Depends(get_export_service),
) -> ExportResponse:
    metadata = file_service.get_metadata(document_id)
    export = export_service.export_document(metadata)
    return ExportResponse(export=export)


@router.get("/exports/{export_id}/download")
def download_export(
    export_id: str,
    export_service: ExportService = Depends(get_export_service),
) -> FileResponse:
    metadata = export_service.get_export_metadata(export_id)
    path = export_service.get_export_file_path(export_id)
    return FileResponse(path, media_type="application/pdf", filename=metadata.filename)
