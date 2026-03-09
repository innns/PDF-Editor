from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.domain_models import Annotation, DocumentMetadata, EditingSession, ExportMetadata


class HealthResponse(BaseModel):
    status: str
    timestamp: datetime


class UploadResponse(BaseModel):
    documents: list[DocumentMetadata]


class SessionSaveRequest(EditingSession):
    pass


class SessionPatchRequest(BaseModel):
    zoom_state: dict[str, Any] | None = Field(default=None, alias="zoomState")
    page_order: list[int] | None = Field(default=None, alias="pageOrder")
    deleted_pages: list[int] | None = Field(default=None, alias="deletedPages")
    rotated_pages: dict[int, int] | None = Field(default=None, alias="rotatedPages")
    annotations_by_page: dict[int, list[Annotation]] | None = Field(default=None, alias="annotationsByPage")
    history_snapshot: dict[str, Any] | None = Field(default=None, alias="historySnapshot")
    version: int | None = None

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class SessionResponse(BaseModel):
    session: EditingSession


class AnnotationsResponse(BaseModel):
    document_id: str = Field(alias="documentId")
    annotations_by_page: dict[int, list[Annotation]] = Field(alias="annotationsByPage")

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class ReorderPagesRequest(BaseModel):
    page_order: list[int] = Field(alias="pageOrder")

    @field_validator("page_order")
    @classmethod
    def validate_unique_pages(cls, value: list[int]) -> list[int]:
        if len(set(value)) != len(value):
            raise ValueError("pageOrder must contain unique page indexes")
        return value

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class DeletePagesRequest(BaseModel):
    pages: list[int]


class RotatePagesRequest(BaseModel):
    page: int
    degrees: int

    @field_validator("degrees")
    @classmethod
    def validate_degrees(cls, value: int) -> int:
        if value not in {90, 180, 270, -90, -180, -270}:
            raise ValueError("degrees must be a quarter-turn increment")
        return value


class SplitPagesRequest(BaseModel):
    groups: list[list[int]] | None = None
    pages: list[int] | None = None


class MergeDocumentsRequest(BaseModel):
    document_ids: list[str] = Field(alias="documentIds")

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class MergeDocumentsResponse(BaseModel):
    document: DocumentMetadata


class SplitDocumentsResponse(BaseModel):
    documents: list[DocumentMetadata]


class ThumbnailsResponse(BaseModel):
    document_id: str = Field(alias="documentId")
    thumbnails: list[str]

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class ExportResponse(BaseModel):
    export: ExportMetadata


class ApiErrorResponse(BaseModel):
    detail: str
