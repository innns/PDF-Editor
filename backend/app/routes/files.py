from fastapi import APIRouter, Depends, File, UploadFile

from app.models.api_models import UploadResponse
from app.services.annotation_service import AnnotationService
from app.services.file_service import FileService
from app.services.pdf_service import PDFService
from app.services.thumbnail_service import ThumbnailService
from app.state import get_annotation_service, get_file_service, get_pdf_service, get_thumbnail_service

router = APIRouter(prefix="/files", tags=["files"])


@router.post("/upload", response_model=UploadResponse)
async def upload_files(
    files: list[UploadFile] = File(...),
    file_service: FileService = Depends(get_file_service),
    pdf_service: PDFService = Depends(get_pdf_service),
    annotation_service: AnnotationService = Depends(get_annotation_service),
    thumbnail_service: ThumbnailService = Depends(get_thumbnail_service),
) -> UploadResponse:
    documents = []
    for upload in files:
        metadata = await file_service.save_upload(upload)
        metadata = pdf_service.inspect_document(metadata)
        default_session = pdf_service.create_default_session(metadata)
        annotation_service.save_session(default_session)
        thumbnail_service.generate_thumbnails(metadata)
        documents.append(
            metadata.model_copy(update={"file_url": f"/api/documents/{metadata.id}/file"})
        )
    return UploadResponse(documents=documents)
