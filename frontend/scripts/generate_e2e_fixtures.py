from pathlib import Path

import fitz
from PIL import Image, ImageDraw


FIXTURE_DIR = Path(__file__).resolve().parent.parent / "e2e" / "fixtures"


def create_pdf(filename: str, page_count: int) -> None:
    FIXTURE_DIR.mkdir(parents=True, exist_ok=True)
    path = FIXTURE_DIR / filename
    document = fitz.open()
    for index in range(page_count):
        page = document.new_page()
        page.insert_text((72, 72), f"{filename} page {index + 1}", fontsize=20)
    document.save(path)
    document.close()


def create_image(filename: str) -> None:
    FIXTURE_DIR.mkdir(parents=True, exist_ok=True)
    path = FIXTURE_DIR / filename
    image = Image.new("RGBA", (240, 140), (245, 238, 220, 255))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((8, 8, 232, 132), radius=18, outline=(255, 106, 61, 255), width=6, fill=(87, 175, 184, 255))
    draw.line((30, 100, 100, 42, 210, 96), fill=(15, 23, 32, 255), width=8)
    draw.text((34, 26), "E2E", fill=(15, 23, 32, 255))
    image.save(path)


if __name__ == "__main__":
    create_pdf("smoke-primary.pdf", 2)
    create_pdf("smoke-secondary.pdf", 1)
    create_image("stamp.png")
