from fastapi import APIRouter, Depends

from app.models.api_models import AnnotationsResponse
from app.services.annotation_service import AnnotationService
from app.services.file_service import FileService
from app.state import get_annotation_service, get_file_service

router = APIRouter(prefix="/documents", tags=["annotations"])


@router.get("/{document_id}/annotations", response_model=AnnotationsResponse)
def get_annotations(
    document_id: str,
    file_service: FileService = Depends(get_file_service),
    annotation_service: AnnotationService = Depends(get_annotation_service),
) -> AnnotationsResponse:
    metadata = file_service.get_metadata(document_id)
    annotations = annotation_service.get_annotations(metadata)
    return AnnotationsResponse(documentId=document_id, annotationsByPage=annotations)
