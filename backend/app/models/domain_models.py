from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


AnnotationType = Literal["text", "highlight", "rectangle", "freehand", "signature", "image"]


class Point(BaseModel):
    x: float
    y: float

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class Annotation(BaseModel):
    id: str
    type: AnnotationType
    page: int
    x: float
    y: float
    width: float = 0.0
    height: float = 0.0
    rotation: float = 0.0
    color: str = "#ff5a36"
    stroke_width: float = Field(default=2.0, alias="strokeWidth")
    opacity: float = 1.0
    text: str | None = None
    font_size: float = Field(default=18.0, alias="fontSize")
    font_family: str = Field(default="Source Sans 3", alias="fontFamily")
    image_ref: str | None = Field(default=None, alias="imageRef")
    path: list[Point] = Field(default_factory=list)
    fill_color: str | None = Field(default=None, alias="fillColor")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="createdAt")
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class ZoomState(BaseModel):
    scale: float = 1.0
    fit_mode: Literal["custom", "fit-width", "fit-page"] = Field(
        default="fit-width",
        alias="fitMode",
    )

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class EditingSession(BaseModel):
    document_id: str = Field(alias="documentId")
    zoom_state: ZoomState | None = Field(default=None, alias="zoomState")
    page_order: list[int] = Field(default_factory=list, alias="pageOrder")
    deleted_pages: list[int] = Field(default_factory=list, alias="deletedPages")
    rotated_pages: dict[int, int] = Field(default_factory=dict, alias="rotatedPages")
    annotations_by_page: dict[int, list[Annotation]] = Field(default_factory=dict, alias="annotationsByPage")
    history_snapshot: dict | None = Field(default=None, alias="historySnapshot")
    version: int = 1
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class DocumentMetadata(BaseModel):
    id: str
    original_filename: str = Field(alias="originalFilename")
    stored_filename: str = Field(alias="storedFilename")
    page_count: int = Field(alias="pageCount")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="createdAt")
    file_size: int = Field(alias="fileSize")
    file_url: str | None = Field(default=None, alias="fileUrl")

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class ExportMetadata(BaseModel):
    export_id: str = Field(alias="exportId")
    document_id: str = Field(alias="documentId")
    filename: str
    file_size: int = Field(alias="fileSize")
    download_url: str = Field(alias="downloadUrl")
    storage_path: str = Field(alias="storagePath")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="createdAt")

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)
