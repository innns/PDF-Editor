from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse

from app.models.api_models import (
    DeletePagesRequest,
    MergeDocumentsRequest,
    MergeDocumentsResponse,
    ReorderPagesRequest,
    RotatePagesRequest,
    SessionPatchRequest,
    SessionResponse,
    SessionSaveRequest,
    SplitDocumentsResponse,
    SplitPagesRequest,
    ThumbnailsResponse,
)
from app.models.domain_models import DocumentMetadata
from app.services.annotation_service import AnnotationService
from app.services.file_service import FileService
from app.services.pdf_service import PDFService
from app.services.thumbnail_service import ThumbnailService
from app.state import get_annotation_service, get_file_service, get_pdf_service, get_thumbnail_service
from app.utils.exceptions import ValidationError

router = APIRouter(prefix="/documents", tags=["documents"])


def load_metadata(document_id: str, file_service: FileService) -> DocumentMetadata:
    metadata = file_service.get_metadata(document_id)
    return metadata.model_copy(update={"file_url": f"/api/documents/{document_id}/file"})


@router.get("/{document_id}/metadata", response_model=DocumentMetadata)
def get_document_metadata(
    document_id: str,
    file_service: FileService = Depends(get_file_service),
) -> DocumentMetadata:
    return load_metadata(document_id, file_service)


@router.get("/{document_id}/file")
def get_document_file(
    document_id: str,
    file_service: FileService = Depends(get_file_service),
) -> FileResponse:
    metadata = file_service.get_metadata(document_id)
    path = file_service.get_document_path(document_id)
    return FileResponse(path, media_type="application/pdf", filename=metadata.original_filename)


@router.get("/{document_id}/thumbnails", response_model=ThumbnailsResponse)
def get_document_thumbnails(
    document_id: str,
    file_service: FileService = Depends(get_file_service),
    thumbnail_service: ThumbnailService = Depends(get_thumbnail_service),
) -> ThumbnailsResponse:
    metadata = file_service.get_metadata(document_id)
    thumbnails = thumbnail_service.generate_thumbnails(metadata)
    return ThumbnailsResponse(documentId=document_id, thumbnails=thumbnails)


@router.get("/{document_id}/session", response_model=SessionResponse)
def get_document_session(
    document_id: str,
    file_service: FileService = Depends(get_file_service),
    annotation_service: AnnotationService = Depends(get_annotation_service),
) -> SessionResponse:
    metadata = file_service.get_metadata(document_id)
    session = annotation_service.load_session(metadata)
    return SessionResponse(session=session)


@router.post("/{document_id}/session", response_model=SessionResponse)
def save_document_session(
    document_id: str,
    request: SessionSaveRequest,
    file_service: FileService = Depends(get_file_service),
    annotation_service: AnnotationService = Depends(get_annotation_service),
) -> SessionResponse:
    if request.document_id != document_id:
        raise ValidationError("The documentId in the payload does not match the route parameter.")
    file_service.get_metadata(document_id)
    session = annotation_service.save_session(request)
    return SessionResponse(session=session)


@router.patch("/{document_id}/session", response_model=SessionResponse)
def patch_document_session(
    document_id: str,
    request: SessionPatchRequest,
    file_service: FileService = Depends(get_file_service),
    annotation_service: AnnotationService = Depends(get_annotation_service),
) -> SessionResponse:
    metadata = file_service.get_metadata(document_id)
    session = annotation_service.patch_session(metadata, request)
    return SessionResponse(session=session)


@router.post("/{document_id}/pages/reorder", response_model=SessionResponse)
def reorder_document_pages(
    document_id: str,
    request: ReorderPagesRequest,
    file_service: FileService = Depends(get_file_service),
    annotation_service: AnnotationService = Depends(get_annotation_service),
) -> SessionResponse:
    metadata = file_service.get_metadata(document_id)
    session = annotation_service.reorder_pages(metadata, request.page_order)
    return SessionResponse(session=session)


@router.post("/{document_id}/pages/delete", response_model=SessionResponse)
def delete_document_pages(
    document_id: str,
    request: DeletePagesRequest,
    file_service: FileService = Depends(get_file_service),
    annotation_service: AnnotationService = Depends(get_annotation_service),
) -> SessionResponse:
    metadata = file_service.get_metadata(document_id)
    session = annotation_service.delete_pages(metadata, request.pages)
    return SessionResponse(session=session)


@router.post("/{document_id}/pages/rotate", response_model=SessionResponse)
def rotate_document_page(
    document_id: str,
    request: RotatePagesRequest,
    file_service: FileService = Depends(get_file_service),
    annotation_service: AnnotationService = Depends(get_annotation_service),
) -> SessionResponse:
    metadata = file_service.get_metadata(document_id)
    session = annotation_service.rotate_page(metadata, request.page, request.degrees)
    return SessionResponse(session=session)


@router.post("/{document_id}/pages/split", response_model=SplitDocumentsResponse)
def split_document_pages(
    document_id: str,
    request: SplitPagesRequest,
    file_service: FileService = Depends(get_file_service),
    pdf_service: PDFService = Depends(get_pdf_service),
    annotation_service: AnnotationService = Depends(get_annotation_service),
    thumbnail_service: ThumbnailService = Depends(get_thumbnail_service),
) -> SplitDocumentsResponse:
    metadata = file_service.get_metadata(document_id)
    if request.groups:
        groups = request.groups
    elif request.pages:
        groups = [[page] for page in request.pages]
    else:
        groups = [[page] for page in range(metadata.page_count)]
    documents = pdf_service.split_document(metadata, groups)
    for created in documents:
        annotation_service.save_session(pdf_service.create_default_session(created))
        thumbnail_service.generate_thumbnails(created)
    documents = [
        created.model_copy(update={"file_url": f"/api/documents/{created.id}/file"})
        for created in documents
    ]
    return SplitDocumentsResponse(documents=documents)


@router.post("/merge", response_model=MergeDocumentsResponse)
def merge_documents(
    request: MergeDocumentsRequest,
    file_service: FileService = Depends(get_file_service),
    pdf_service: PDFService = Depends(get_pdf_service),
    annotation_service: AnnotationService = Depends(get_annotation_service),
    thumbnail_service: ThumbnailService = Depends(get_thumbnail_service),
) -> MergeDocumentsResponse:
    if len(request.document_ids) < 2:
        raise ValidationError("documentIds must include at least two documents to merge.")
    documents = [file_service.get_metadata(document_id) for document_id in request.document_ids]
    merged = pdf_service.merge_documents(documents)
    annotation_service.save_session(pdf_service.create_default_session(merged))
    thumbnail_service.generate_thumbnails(merged)
    merged = merged.model_copy(update={"file_url": f"/api/documents/{merged.id}/file"})
    return MergeDocumentsResponse(document=merged)
