from io import BytesIO

import fitz
from pypdf import PdfReader, PdfWriter

from app.models.domain_models import DocumentMetadata, EditingSession
from app.services.file_service import FileService
from app.utils.exceptions import ValidationError
from app.utils.ids import generate_id
from app.utils.paths import document_file_path


class PDFService:
    def __init__(self, file_service: FileService) -> None:
        self.file_service = file_service

    def inspect_document(self, metadata: DocumentMetadata) -> DocumentMetadata:
        path = self.file_service.get_document_path(metadata.id)
        reader = PdfReader(str(path))
        updated = metadata.model_copy(update={"page_count": len(reader.pages)})
        self.file_service.update_metadata(updated)
        return updated

    def create_default_session(self, metadata: DocumentMetadata) -> EditingSession:
        return EditingSession(
            documentId=metadata.id,
            pageOrder=list(range(metadata.page_count)),
            deletedPages=[],
            rotatedPages={},
            annotationsByPage={},
        )

    def merge_documents(self, documents: list[DocumentMetadata]) -> DocumentMetadata:
        if len(documents) < 2:
            raise ValidationError("Merging requires at least two documents.")

        writer = PdfWriter()
        for document in documents:
            path = self.file_service.get_document_path(document.id)
            reader = PdfReader(str(path))
            for page in reader.pages:
                writer.add_page(page)

        merged_id = generate_id("doc")
        merged_name = "merged-document.pdf"
        destination = document_file_path(merged_id, merged_name)
        with destination.open("wb") as handle:
            writer.write(handle)

        size = destination.stat().st_size
        metadata = DocumentMetadata(
            id=merged_id,
            originalFilename=merged_name,
            storedFilename=merged_name,
            pageCount=len(writer.pages),
            fileSize=size,
        )
        self.file_service.save_metadata(metadata)
        return metadata

    def split_document(self, metadata: DocumentMetadata, groups: list[list[int]]) -> list[DocumentMetadata]:
        source_path = self.file_service.get_document_path(metadata.id)
        reader = PdfReader(str(source_path))
        created_documents: list[DocumentMetadata] = []

        for group_index, group in enumerate(groups, start=1):
            writer = PdfWriter()
            for page_index in group:
                if page_index < 0 or page_index >= len(reader.pages):
                    raise ValidationError(f"Page index {page_index} is out of range for split.")
                writer.add_page(reader.pages[page_index])

            split_id = generate_id("doc")
            split_name = f"{metadata.id}_split_{group_index}.pdf"
            destination = document_file_path(split_id, split_name)
            with destination.open("wb") as handle:
                writer.write(handle)

            created = DocumentMetadata(
                id=split_id,
                originalFilename=split_name,
                storedFilename=split_name,
                pageCount=len(writer.pages),
                fileSize=destination.stat().st_size,
            )
            self.file_service.save_metadata(created)
            created_documents.append(created)

        return created_documents

    def apply_page_operations(self, metadata: DocumentMetadata, session: EditingSession) -> tuple[bytes, list[int]]:
        source_path = self.file_service.get_document_path(metadata.id)
        reader = PdfReader(str(source_path))
        writer = PdfWriter()

        deleted = set(session.deleted_pages)
        final_order = [page for page in session.page_order if page not in deleted]
        if not final_order:
            raise ValidationError("The current session deletes all pages. Export requires at least one page.")

        for original_page_index in final_order:
            if original_page_index < 0 or original_page_index >= len(reader.pages):
                raise ValidationError(f"Page index {original_page_index} is out of range.")
            page = reader.pages[original_page_index]
            rotation = session.rotated_pages.get(original_page_index, 0)
            if rotation:
                page.rotate(rotation)
            writer.add_page(page)

        buffer = BytesIO()
        writer.write(buffer)
        return buffer.getvalue(), final_order

    def get_page_dimensions(self, document_bytes: bytes) -> list[tuple[float, float]]:
        pdf = fitz.open(stream=document_bytes, filetype="pdf")
        dimensions = [(page.rect.width, page.rect.height) for page in pdf]
        pdf.close()
        return dimensions
