import base64
import json
from datetime import datetime, timezone
from pathlib import Path

import fitz

from app.models.domain_models import Annotation, DocumentMetadata, ExportMetadata
from app.services.annotation_service import AnnotationService
from app.services.file_service import FileService
from app.services.pdf_service import PDFService
from app.utils.exceptions import NotFoundError
from app.utils.ids import generate_id
from app.utils.io import atomic_write_text
from app.utils.paths import export_file_path, export_metadata_file_path


class ExportService:
    def __init__(
        self,
        file_service: FileService,
        pdf_service: PDFService,
        annotation_service: AnnotationService,
    ) -> None:
        self.file_service = file_service
        self.pdf_service = pdf_service
        self.annotation_service = annotation_service

    def export_document(self, metadata: DocumentMetadata) -> ExportMetadata:
        session = self.annotation_service.load_session(metadata)
        transformed_bytes, final_order = self.pdf_service.apply_page_operations(metadata, session)
        pdf = fitz.open(stream=transformed_bytes, filetype="pdf")

        for final_index, original_page_index in enumerate(final_order):
            page = pdf.load_page(final_index)
            annotations = session.annotations_by_page.get(original_page_index, [])
            for annotation in annotations:
                self._apply_annotation(page, annotation)

        export_id = generate_id("exp")
        export_filename = f"{Path(metadata.original_filename).stem}_edited.pdf"
        output_path = export_file_path(export_id, export_filename)
        pdf.save(output_path, deflate=True, garbage=3)
        pdf.close()

        export_metadata = ExportMetadata(
            exportId=export_id,
            documentId=metadata.id,
            filename=output_path.name,
            fileSize=output_path.stat().st_size,
            downloadUrl=f"/api/exports/{export_id}/download",
            storagePath=str(output_path),
            createdAt=datetime.now(timezone.utc),
        )
        metadata_path = export_metadata_file_path(export_id)
        atomic_write_text(metadata_path, json.dumps(export_metadata.model_dump(mode="json", by_alias=True), indent=2))
        return export_metadata

    def get_export_metadata(self, export_id: str) -> ExportMetadata:
        path = export_metadata_file_path(export_id)
        if not path.exists():
            raise NotFoundError(f"Export metadata {export_id} was not found.")
        payload = json.loads(path.read_text(encoding="utf-8"))
        return ExportMetadata.model_validate(payload)

    def get_export_file_path(self, export_id: str) -> Path:
        metadata = self.get_export_metadata(export_id)
        path = Path(metadata.storage_path)
        if not path.exists():
            raise NotFoundError(f"Exported PDF {export_id} was not found.")
        return path

    def _apply_annotation(self, page: fitz.Page, annotation: Annotation) -> None:
        rect = self._rect_for_annotation(page, annotation)
        color = self._hex_to_rgb(annotation.color)
        opacity = max(0.1, min(annotation.opacity, 1.0))

        if annotation.type in {"text", "signature"}:
            page.insert_textbox(
                rect,
                annotation.text or "",
                fontsize=max(annotation.font_size, 8),
                fontname="helv",
                color=color,
                align=0,
                rotate=int(annotation.rotation),
            )
            return

        if annotation.type == "highlight":
            shape = page.new_shape()
            shape.draw_rect(rect)
            shape.finish(color=color, fill=color, fill_opacity=min(opacity, 0.35), width=0.5)
            shape.commit(overlay=True)
            return

        if annotation.type == "rectangle":
            shape = page.new_shape()
            shape.draw_rect(rect)
            fill_color = self._hex_to_rgb(annotation.fill_color) if annotation.fill_color else None
            shape.finish(
                color=color,
                fill=fill_color,
                width=max(annotation.stroke_width, 1.0),
                fill_opacity=opacity if fill_color else 0,
            )
            shape.commit(overlay=True)
            return

        if annotation.type == "freehand":
            if len(annotation.path) < 2:
                return
            shape = page.new_shape()
            points = [self._point_for_page(page, point.x, point.y) for point in annotation.path]
            for start, end in zip(points, points[1:]):
                shape.draw_line(start, end)
            shape.finish(color=color, width=max(annotation.stroke_width, 1.0), closePath=False)
            shape.commit(overlay=True)
            return

        if annotation.type == "image" and annotation.image_ref:
            image_bytes = self._decode_image(annotation.image_ref)
            page.insert_image(rect, stream=image_bytes, keep_proportion=True, overlay=True)

    def _rect_for_annotation(self, page: fitz.Page, annotation: Annotation) -> fitz.Rect:
        x0 = annotation.x * page.rect.width
        y0 = annotation.y * page.rect.height
        width = max(annotation.width * page.rect.width, 8)
        height = max(annotation.height * page.rect.height, 8)
        return fitz.Rect(x0, y0, x0 + width, y0 + height)

    def _point_for_page(self, page: fitz.Page, x: float, y: float) -> fitz.Point:
        return fitz.Point(x * page.rect.width, y * page.rect.height)

    def _hex_to_rgb(self, value: str | None) -> tuple[float, float, float]:
        if not value:
            return (0.1, 0.1, 0.1)
        hex_value = value.lstrip("#")
        if len(hex_value) != 6:
            return (0.1, 0.1, 0.1)
        channels = [int(hex_value[index : index + 2], 16) / 255 for index in range(0, 6, 2)]
        return (channels[0], channels[1], channels[2])

    def _decode_image(self, image_ref: str) -> bytes:
        if image_ref.startswith("data:"):
            _, encoded = image_ref.split(",", 1)
            return base64.b64decode(encoded)
        path = Path(image_ref)
        if path.exists():
            return path.read_bytes()
        raise ValueError("Unsupported image reference for export.")
