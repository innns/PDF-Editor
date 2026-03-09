import fitz

from app.config import get_settings
from app.models.domain_models import DocumentMetadata
from app.services.file_service import FileService
from app.utils.paths import thumbnails_dir


class ThumbnailService:
    def __init__(self, file_service: FileService) -> None:
        self.file_service = file_service
        self.settings = get_settings()

    def generate_thumbnails(self, metadata: DocumentMetadata, force: bool = False) -> list[str]:
        target_dir = thumbnails_dir(metadata.id)
        path = self.file_service.get_document_path(metadata.id)
        document = fitz.open(path)
        urls: list[str] = []

        for page_index, page in enumerate(document):
            thumbnail_path = target_dir / f"page-{page_index + 1}.png"
            if force or not thumbnail_path.exists():
                scale = self.settings.thumbnail_width / page.rect.width
                matrix = fitz.Matrix(scale, scale)
                pixmap = page.get_pixmap(matrix=matrix, alpha=False)
                pixmap.save(thumbnail_path)
            urls.append(f"/storage/thumbnails/{metadata.id}/{thumbnail_path.name}")

        document.close()
        return urls
