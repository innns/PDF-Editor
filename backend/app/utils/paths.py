from pathlib import Path

from app.config import get_settings


def document_file_path(document_id: str, stored_filename: str) -> Path:
    settings = get_settings()
    return settings.uploads_dir / f"{document_id}_{stored_filename}"


def session_dir(document_id: str) -> Path:
    settings = get_settings()
    path = settings.sessions_dir / document_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def session_file_path(document_id: str) -> Path:
    return session_dir(document_id) / "session.json"


def metadata_file_path(document_id: str) -> Path:
    return session_dir(document_id) / "metadata.json"


def export_file_path(export_id: str, original_filename: str) -> Path:
    settings = get_settings()
    safe_name = Path(original_filename).stem.replace(" ", "_") or "export"
    return settings.exports_dir / f"{export_id}_{safe_name}.pdf"


def export_metadata_file_path(export_id: str) -> Path:
    settings = get_settings()
    return settings.exports_dir / f"{export_id}.json"


def thumbnails_dir(document_id: str) -> Path:
    settings = get_settings()
    path = settings.thumbnails_dir / document_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def asset_file_path(asset_id: str, suffix: str) -> Path:
    settings = get_settings()
    return settings.assets_dir / f"{asset_id}{suffix}"
