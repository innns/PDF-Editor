import json
import sys
from pathlib import Path

import fitz


def inspect_pdf(path: Path) -> dict:
    document = fitz.open(path)
    text_fragments = []
    image_count = 0
    drawing_count = 0
    pages = []

    for page in document:
        page_text = page.get_text()
        page_words = [
            {
                "x0": word[0],
                "y0": word[1],
                "x1": word[2],
                "y1": word[3],
                "text": word[4],
            }
            for word in page.get_text("words")
        ]

        image_rects = []
        for image in page.get_images(full=True):
            xref = image[0]
            for rect in page.get_image_rects(xref):
                image_rects.append(
                    {
                        "x0": rect.x0,
                        "y0": rect.y0,
                        "x1": rect.x1,
                        "y1": rect.y1,
                    }
                )

        drawing_rects = []
        for drawing in page.get_drawings():
            rect = drawing.get("rect")
            if rect is None:
                continue
            drawing_rects.append(
                {
                    "x0": rect.x0,
                    "y0": rect.y0,
                    "x1": rect.x1,
                    "y1": rect.y1,
                    "fill": drawing.get("fill"),
                    "color": drawing.get("color"),
                }
            )

        text_fragments.append(page_text)
        image_count += len(image_rects)
        drawing_count += len(drawing_rects)
        pages.append(
            {
                "width": page.rect.width,
                "height": page.rect.height,
                "text": page_text,
                "words": page_words,
                "imageRects": image_rects,
                "drawingRects": drawing_rects,
            }
        )

    payload = {
        "pageCount": document.page_count,
        "text": "\n".join(fragment.strip() for fragment in text_fragments if fragment.strip()),
        "imageCount": image_count,
        "drawingCount": drawing_count,
        "pages": pages,
    }
    document.close()
    return payload


if __name__ == "__main__":
    target = Path(sys.argv[1]).resolve()
    print(json.dumps(inspect_pdf(target)))
