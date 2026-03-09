import json
from datetime import datetime, timezone

from app.models.api_models import SessionPatchRequest
from app.models.domain_models import DocumentMetadata, EditingSession
from app.services.pdf_service import PDFService
from app.utils.exceptions import ValidationError
from app.utils.io import atomic_write_text
from app.utils.paths import session_file_path


class AnnotationService:
    def __init__(self, pdf_service: PDFService) -> None:
        self.pdf_service = pdf_service

    def load_session(self, metadata: DocumentMetadata) -> EditingSession:
        path = session_file_path(metadata.id)
        if not path.exists():
            session = self.pdf_service.create_default_session(metadata)
            self.save_session(session)
            return session
        payload = json.loads(path.read_text(encoding="utf-8"))
        return EditingSession.model_validate(payload)

    def save_session(self, session: EditingSession) -> EditingSession:
        updated = session.model_copy(update={"updated_at": datetime.now(timezone.utc)})
        updated = EditingSession.model_validate(updated.model_dump(by_alias=True))
        self._validate_session(updated)
        path = session_file_path(updated.document_id)
        atomic_write_text(path, json.dumps(updated.model_dump(mode="json", by_alias=True), indent=2))
        return updated

    def patch_session(self, metadata: DocumentMetadata, patch: SessionPatchRequest) -> EditingSession:
        current = self.load_session(metadata)
        current_data = current.model_dump(by_alias=True)
        patch_data = patch.model_dump(exclude_none=True, by_alias=True)
        updated = EditingSession.model_validate({**current_data, **patch_data})
        return self.save_session(updated)

    def get_annotations(self, metadata: DocumentMetadata) -> dict[int, list]:
        return self.load_session(metadata).annotations_by_page

    def reorder_pages(self, metadata: DocumentMetadata, page_order: list[int]) -> EditingSession:
        session = self.load_session(metadata)
        if sorted(page_order) != list(range(metadata.page_count)):
            raise ValidationError("pageOrder must contain each page index exactly once.")
        updated = session.model_copy(update={"page_order": page_order})
        return self.save_session(updated)

    def delete_pages(self, metadata: DocumentMetadata, pages: list[int]) -> EditingSession:
        session = self.load_session(metadata)
        deleted = sorted(set(session.deleted_pages).union(pages))
        updated = session.model_copy(update={"deleted_pages": deleted})
        return self.save_session(updated)

    def rotate_page(self, metadata: DocumentMetadata, page: int, degrees: int) -> EditingSession:
        if page < 0 or page >= metadata.page_count:
            raise ValidationError(f"Page index {page} is out of range.")
        session = self.load_session(metadata)
        rotations = dict(session.rotated_pages)
        current = rotations.get(page, 0)
        rotations[page] = (current + degrees) % 360
        updated = session.model_copy(update={"rotated_pages": rotations})
        return self.save_session(updated)

    def _validate_session(self, session: EditingSession) -> None:
        if len(set(session.page_order)) != len(session.page_order):
            raise ValidationError("Session page order must not contain duplicates.")
