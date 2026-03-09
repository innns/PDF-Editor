from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "PDF Editor"
    api_prefix: str = "/api"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:4173",
            "http://127.0.0.1:4173",
            "http://localhost:3000",
        ]
    )
    max_upload_size_mb: int = 50
    storage_root: Path = Path(__file__).resolve().parent / "storage"
    uploads_dir_name: str = "uploads"
    sessions_dir_name: str = "sessions"
    exports_dir_name: str = "exports"
    thumbnails_dir_name: str = "thumbnails"
    assets_dir_name: str = "assets"
    thumbnail_width: int = 180

    model_config = SettingsConfigDict(env_prefix="PDF_EDITOR_", env_file=".env", extra="ignore")

    @property
    def uploads_dir(self) -> Path:
        return self.storage_root / self.uploads_dir_name

    @property
    def sessions_dir(self) -> Path:
        return self.storage_root / self.sessions_dir_name

    @property
    def exports_dir(self) -> Path:
        return self.storage_root / self.exports_dir_name

    @property
    def thumbnails_dir(self) -> Path:
        return self.storage_root / self.thumbnails_dir_name

    @property
    def assets_dir(self) -> Path:
        return self.storage_root / self.assets_dir_name


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    settings = Settings()
    for path in [
        settings.storage_root,
        settings.uploads_dir,
        settings.sessions_dir,
        settings.exports_dir,
        settings.thumbnails_dir,
        settings.assets_dir,
    ]:
        path.mkdir(parents=True, exist_ok=True)
    return settings
