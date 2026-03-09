import json
from pathlib import Path

from fastapi import UploadFile

from app.config import get_settings
from app.models.domain_models import DocumentMetadata
from app.utils.exceptions import NotFoundError, ValidationError
from app.utils.ids import generate_id
from app.utils.io import atomic_write_text
from app.utils.paths import document_file_path, metadata_file_path


class FileService:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def save_upload(self, upload: UploadFile) -> DocumentMetadata:
        filename = upload.filename or "document.pdf"
        if not filename.lower().endswith(".pdf"):
            raise ValidationError(f"Unsupported file type for {filename}. Only PDF uploads are allowed.")

        file_bytes = await upload.read()
        max_size = self.settings.max_upload_size_mb * 1024 * 1024
        if len(file_bytes) > max_size:
            raise ValidationError(
                f"{filename} exceeds the {self.settings.max_upload_size_mb} MB upload limit."
            )
        if not file_bytes.startswith(b"%PDF"):
            raise ValidationError(f"{filename} is not a valid PDF file.")

        document_id = generate_id("doc")
        stored_filename = Path(filename).name
        destination = document_file_path(document_id, stored_filename)
        destination.write_bytes(file_bytes)

        metadata = DocumentMetadata(
            id=document_id,
            originalFilename=filename,
            storedFilename=stored_filename,
            pageCount=0,
            fileSize=len(file_bytes),
        )
        self.save_metadata(metadata)
        return metadata

    def save_metadata(self, metadata: DocumentMetadata) -> None:
        path = metadata_file_path(metadata.id)
        atomic_write_text(path, json.dumps(metadata.model_dump(mode="json", by_alias=True), indent=2))

    def update_metadata(self, metadata: DocumentMetadata) -> DocumentMetadata:
        self.save_metadata(metadata)
        return metadata

    def get_metadata(self, document_id: str) -> DocumentMetadata:
        path = metadata_file_path(document_id)
        if not path.exists():
            raise NotFoundError(f"Document {document_id} was not found.")
        payload = json.loads(path.read_text(encoding="utf-8"))
        return DocumentMetadata.model_validate(payload)

    def get_document_path(self, document_id: str) -> Path:
        metadata = self.get_metadata(document_id)
        path = document_file_path(document_id, metadata.stored_filename)
        if not path.exists():
            raise NotFoundError(f"Stored PDF for document {document_id} was not found.")
        return path
