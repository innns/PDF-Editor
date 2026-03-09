import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const primaryPdf = path.join(__dirname, "fixtures", "smoke-primary.pdf");
const secondaryPdf = path.join(__dirname, "fixtures", "smoke-secondary.pdf");
const stampImage = path.join(__dirname, "fixtures", "stamp.png");
const repoRoot = path.resolve(__dirname, "..", "..");

async function uploadPrimaryPdf(page) {
  await page.goto("/");
  await page.getByTestId("upload-input").setInputFiles(primaryPdf);
  await expect(page.getByTestId("document-title")).toHaveText("smoke-primary.pdf");
}

async function getDocumentId(page) {
  const documentId = await page.getByTestId("document-id").textContent();
  expect(documentId).toBeTruthy();
  return documentId;
}

async function getStage(page) {
  await page.getByTestId("page-editor").first().scrollIntoViewIfNeeded();
  const stage = page.locator(".konvajs-content").first();
  await expect(stage).toBeVisible({ timeout: 30_000 });
  return stage;
}

async function dragOnStage(page, from, to) {
  const stage = await getStage(page);
  const box = await stage.boundingBox();
  expect(box).toBeTruthy();

  await page.mouse.move(box.x + from.x, box.y + from.y);
  await page.mouse.down();
  await page.waitForTimeout(80);
  await page.mouse.move(box.x + to.x, box.y + to.y, { steps: 10 });
  await page.mouse.up();
}

async function clickStage(page, position) {
  const stage = await getStage(page);
  await stage.click({ position });
}

async function dragAbsolute(page, from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.waitForTimeout(80);
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();
}

async function getStageBox(page) {
  const stage = await getStage(page);
  const box = await stage.boundingBox();
  expect(box).toBeTruthy();
  return box;
}

async function reorderThumbnails(page, fromIndex, toIndex) {
  await page.evaluate(
    ({ fromIndex, toIndex }) => {
      const items = Array.from(document.querySelectorAll("[data-testid='thumbnail-item']"));
      const source = items[fromIndex];
      const target = items[toIndex];
      if (!source || !target) {
        throw new Error("Thumbnail reorder target not found.");
      }

      const dataTransfer = new DataTransfer();
      source.dispatchEvent(new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer }));
      target.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer }));
      target.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer }));
      source.dispatchEvent(new DragEvent("dragend", { bubbles: true, cancelable: true, dataTransfer }));
    },
    { fromIndex, toIndex }
  );
}

function getAnnotationBox(annotation, stageBox) {
  return {
    x0: stageBox.x + annotation.x * stageBox.width,
    y0: stageBox.y + annotation.y * stageBox.height,
    x1: stageBox.x + (annotation.x + annotation.width) * stageBox.width,
    y1: stageBox.y + (annotation.y + annotation.height) * stageBox.height,
  };
}

function getBoxCenter(box) {
  return {
    x: (box.x0 + box.x1) / 2,
    y: (box.y0 + box.y1) / 2,
  };
}

function inspectExportedPdf(filePath) {
  const raw = execFileSync(
    "uv",
    ["run", "python", "frontend/scripts/inspect_exported_pdf.py", filePath],
    {
      cwd: repoRoot,
      encoding: "utf-8",
      env: process.env,
    }
  );
  return JSON.parse(raw);
}

async function getSessionPayload(request, documentId) {
  const response = await request.get(`/api/documents/${documentId}/session`);
  return response.json();
}

test.describe("PDF editor smoke flows", () => {
  test("loads the upload surface", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("upload-panel")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Edit, annotate, reorder/i })).toBeVisible();
  });

  test("uploads a PDF, supports page operations, and opens export dialog", async ({ page }) => {
    await uploadPrimaryPdf(page);

    await expect(page.getByTestId("source-pages-count")).toContainText("2 source pages");
    await expect(page.getByTestId("active-pages-count")).toContainText("2 active pages");
    await expect(page.getByTestId("thumbnail-sidebar")).toBeVisible();
    await expect(page.getByTestId("thumbnail-item")).toHaveCount(2);
    await expect(page.getByTestId("page-editor")).toHaveCount(2);

    await page.getByTestId("toolbar-rotate-page").click();
    await expect(page.getByTestId("thumbnail-item").first()).toContainText("90°");

    await page.getByTestId("toolbar-delete-page").click();
    await expect(page.getByTestId("active-pages-count")).toContainText("1 active pages");
    await expect(page.getByTestId("thumbnail-item")).toHaveCount(1);

    await page.getByTestId("toolbar-undo").click();
    await expect(page.getByTestId("active-pages-count")).toContainText("2 active pages");
    await expect(page.getByTestId("thumbnail-item")).toHaveCount(2);

    await page.getByTestId("toolbar-export").click();
    await expect(page.getByTestId("export-dialog")).toBeVisible();
    await expect(page.getByTestId("export-download-link")).toHaveAttribute("href", /\/api\/exports\/.+\/download$/);
  });

  test("creates a text annotation and persists it to the session API", async ({ page, request }) => {
    await uploadPrimaryPdf(page);

    const documentId = await getDocumentId(page);

    page.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("prompt");
      await dialog.accept("Playwright note");
    });

    await page.getByTestId("tool-text").click();
    const stage = page.locator(".konvajs-content").first();
    await expect(stage).toBeVisible();
    await stage.click({ position: { x: 120, y: 120 } });
    await expect(page.getByTestId("toolbar-undo")).toBeEnabled();

    await expect
      .poll(async () => {
        const response = await request.get(`/api/documents/${documentId}/session`);
        const payload = await response.json();
        return payload.session.annotationsByPage?.["0"]?.[0]?.text ?? null;
      })
      .toBe("Playwright note");
  });

  test("creates a highlight annotation and persists it to the session API", async ({ page, request }) => {
    await uploadPrimaryPdf(page);

    const documentId = await getDocumentId(page);

    await page.getByTestId("tool-highlight").click();
    await dragOnStage(page, { x: 100, y: 150 }, { x: 300, y: 210 });

    await expect
      .poll(async () => {
        const payload = await getSessionPayload(request, documentId);
        return (payload.session.annotationsByPage?.["0"] ?? []).map((annotation) => annotation.type);
      })
      .toContain("highlight");
  });

  test("creates a signature annotation and exports it as text", async ({ page, request }) => {
    await uploadPrimaryPdf(page);

    const documentId = await getDocumentId(page);

    page.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("prompt");
      await dialog.accept("Signed By Playwright");
    });

    await page.getByTestId("tool-signature").click();
    await clickStage(page, { x: 120, y: 340 });

    await expect
      .poll(async () => {
        const payload = await getSessionPayload(request, documentId);
        return (payload.session.annotationsByPage?.["0"] ?? []).map((annotation) => annotation.type);
      })
      .toContain("signature");

    await page.getByTestId("toolbar-export").click();
    await expect(page.getByTestId("export-dialog")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-download-link").click();
    const download = await downloadPromise;

    const outputPath = path.join(os.tmpdir(), `pdf-editor-signature-${Date.now()}.pdf`);
    await download.saveAs(outputPath);

    const inspection = inspectExportedPdf(outputPath);
    expect(inspection.text.replace(/\s+/g, " ")).toContain("Signed By Playwright");
  });

  test("merges an additional PDF into the current session", async ({ page }) => {
    await uploadPrimaryPdf(page);

    await page.getByTestId("toolbar-merge-input").setInputFiles(secondaryPdf);

    await expect(page.getByTestId("document-title")).toHaveText("merged-document.pdf");
    await expect(page.getByTestId("source-pages-count")).toContainText("3 source pages");
    await expect(page.getByTestId("active-pages-count")).toContainText("3 active pages");
    await expect(page.getByTestId("thumbnail-item")).toHaveCount(3);
  });

  test("splits selected pages into a new document", async ({ page }) => {
    await uploadPrimaryPdf(page);

    page.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("prompt");
      await dialog.accept("2");
    });

    await page.getByTestId("toolbar-split").click();

    await expect(page.getByTestId("document-title")).toContainText("_split_1.pdf");
    await expect(page.getByTestId("source-pages-count")).toContainText("1 source pages");
    await expect(page.getByTestId("active-pages-count")).toContainText("1 active pages");
    await expect(page.getByTestId("thumbnail-item")).toHaveCount(1);
  });

  test("reorders pages from the thumbnail sidebar and persists the new order", async ({ page, request }) => {
    await uploadPrimaryPdf(page);

    const documentId = await getDocumentId(page);
    const items = page.getByTestId("thumbnail-item");
    await expect(items).toHaveCount(2);

    await reorderThumbnails(page, 0, 1);
    await expect(items.nth(0)).toContainText("Page 2");

    await expect
      .poll(async () => {
        const payload = await getSessionPayload(request, documentId);
        return payload.session.pageOrder;
      })
      .toEqual([1, 0]);
  });

  test("exports and triggers a browser download", async ({ page }) => {
    await uploadPrimaryPdf(page);

    await page.getByTestId("toolbar-export").click();
    await expect(page.getByTestId("export-dialog")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-download-link").click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain("smoke-primary");
    expect(download.suggestedFilename()).toContain(".pdf");
  });

  test("creates rectangle, freehand, and image annotations, then validates exported PDF content", async ({
    page,
    request,
  }) => {
    await uploadPrimaryPdf(page);

    const documentId = await getDocumentId(page);

    page.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("prompt");
      await dialog.accept("Playwright export note");
    });
    await page.getByTestId("tool-text").click();
    await (await getStage(page)).click({ position: { x: 120, y: 90 } });

    await page.getByTestId("tool-rectangle").click();
    await dragOnStage(page, { x: 110, y: 130 }, { x: 250, y: 230 });

    await page.getByTestId("tool-freehand").click();
    const stage = await getStage(page);
    const box = await stage.boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.move(box.x + 120, box.y + 280);
    await page.mouse.down();
    await page.mouse.move(box.x + 180, box.y + 250, { steps: 4 });
    await page.mouse.move(box.x + 240, box.y + 290, { steps: 4 });
    await page.mouse.move(box.x + 300, box.y + 260, { steps: 4 });
    await page.mouse.up();

    await page.getByTestId("toolbar-image-input").setInputFiles(stampImage);
    await (await getStage(page)).click({ position: { x: 300, y: 140 } });

    await expect
      .poll(async () => {
        const response = await request.get(`/api/documents/${documentId}/session`);
        const payload = await response.json();
        return (payload.session.annotationsByPage?.["0"] ?? []).map((annotation) => annotation.type).sort();
      })
      .toEqual(["freehand", "image", "rectangle", "text"]);

    await page.getByTestId("toolbar-export").click();
    await expect(page.getByTestId("export-dialog")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-download-link").click();
    const download = await downloadPromise;

    const outputPath = path.join(os.tmpdir(), `pdf-editor-e2e-${Date.now()}.pdf`);
    await download.saveAs(outputPath);

    const inspection = inspectExportedPdf(outputPath);
    expect(inspection.pageCount).toBe(2);
    expect(inspection.text.replace(/\s+/g, " ")).toContain("Playwright export note");
    expect(inspection.imageCount).toBeGreaterThanOrEqual(1);
    expect(inspection.drawingCount).toBeGreaterThanOrEqual(2);

    const firstPage = inspection.pages[0];
    const wordTexts = firstPage.words.map((word) => word.text);
    expect(wordTexts).toContain("Playwright");
    expect(wordTexts).toContain("note");

    const playwrightWord = firstPage.words.find((word) => word.text === "Playwright");
    expect(playwrightWord.x0).toBeLessThan(140);
    expect(playwrightWord.y0).toBeLessThan(110);

    const imageRect = firstPage.imageRects[0];
    expect(imageRect.x0).toBeGreaterThan(200);
    expect(imageRect.y0).toBeGreaterThan(100);

    const largeDrawingRects = firstPage.drawingRects.filter(
      (rect) => rect.x1 - rect.x0 > 40 && rect.y1 - rect.y0 > 20
    );
    expect(largeDrawingRects.length).toBeGreaterThanOrEqual(2);
  });

  test("validates transformed rectangle/image export geometry", async ({
    page,
    request,
  }) => {
    await uploadPrimaryPdf(page);

    const documentId = await getDocumentId(page);

    await page.getByTestId("tool-rectangle").click();
    await dragOnStage(page, { x: 110, y: 120 }, { x: 220, y: 210 });

    await page.getByTestId("toolbar-image-input").setInputFiles(stampImage);
    await clickStage(page, { x: 290, y: 150 });

    await page.getByTestId("tool-select").click();

    await expect
      .poll(async () => {
        const payload = await getSessionPayload(request, documentId);
        const annotations = payload.session.annotationsByPage?.["0"] ?? [];
        const rectangle = annotations.find((annotation) => annotation.type === "rectangle");
        const image = annotations.find((annotation) => annotation.type === "image");
        return rectangle && image ? { rectangle, image } : null;
      })
      .not.toBeNull();

    const createdPayload = await getSessionPayload(request, documentId);
    const createdAnnotations = createdPayload.session.annotationsByPage?.["0"] ?? [];
    const createdRectangle = createdAnnotations.find((annotation) => annotation.type === "rectangle");
    const createdImage = createdAnnotations.find((annotation) => annotation.type === "image");

    const targetGeometry = {
      rectangle: { x: 0.24, y: 0.18, width: 0.22, height: 0.18 },
      image: { x: 0.48, y: 0.22, width: 0.28, height: 0.2 },
    };
    const stageBox = await getStageBox(page);

    await dragAbsolute(
      page,
      getBoxCenter(getAnnotationBox(createdRectangle, stageBox)),
      {
        x: stageBox.x + (targetGeometry.rectangle.x + createdRectangle.width / 2) * stageBox.width,
        y: stageBox.y + (targetGeometry.rectangle.y + createdRectangle.height / 2) * stageBox.height,
      }
    );
    await dragAbsolute(
      page,
      getBoxCenter(getAnnotationBox(createdImage, stageBox)),
      {
        x: stageBox.x + (targetGeometry.image.x + createdImage.width / 2) * stageBox.width,
        y: stageBox.y + (targetGeometry.image.y + createdImage.height / 2) * stageBox.height,
      }
    );

    await page.evaluate(
      ({ rectangleId, imageId, targetGeometry }) => {
        window.__PDF_EDITOR_E2E__.updateAnnotationGeometry(0, rectangleId, {
          width: targetGeometry.rectangle.width,
          height: targetGeometry.rectangle.height,
        });
        window.__PDF_EDITOR_E2E__.updateAnnotationGeometry(0, imageId, {
          width: targetGeometry.image.width,
          height: targetGeometry.image.height,
        });
      },
      {
        rectangleId: createdRectangle.id,
        imageId: createdImage.id,
        targetGeometry,
      }
    );

    await expect
      .poll(async () => {
        const payload = await getSessionPayload(request, documentId);
        const annotations = payload.session.annotationsByPage?.["0"] ?? [];
        const rectangle = annotations.find((annotation) => annotation.type === "rectangle");
        const image = annotations.find((annotation) => annotation.type === "image");
        if (!rectangle || !image) {
          return false;
        }
        return (
          Math.abs(rectangle.x - targetGeometry.rectangle.x) < 0.02 &&
          Math.abs(rectangle.y - targetGeometry.rectangle.y) < 0.02 &&
          Math.abs(rectangle.width - targetGeometry.rectangle.width) < 0.001 &&
          Math.abs(rectangle.height - targetGeometry.rectangle.height) < 0.001 &&
          Math.abs(image.x - targetGeometry.image.x) < 0.02 &&
          Math.abs(image.y - targetGeometry.image.y) < 0.02 &&
          Math.abs(image.width - targetGeometry.image.width) < 0.001 &&
          Math.abs(image.height - targetGeometry.image.height) < 0.001
        );
      })
      .toBe(true);

    const payload = await getSessionPayload(request, documentId);
    const annotations = payload.session.annotationsByPage?.["0"] ?? [];
    const rectangle = annotations.find((annotation) => annotation.type === "rectangle");
    const image = annotations.find((annotation) => annotation.type === "image");

    expect(rectangle.x).toBeCloseTo(targetGeometry.rectangle.x, 2);
    expect(rectangle.y).toBeCloseTo(targetGeometry.rectangle.y, 2);
    expect(rectangle.width).toBeCloseTo(targetGeometry.rectangle.width, 2);
    expect(rectangle.height).toBeCloseTo(targetGeometry.rectangle.height, 2);

    expect(image.x).toBeCloseTo(targetGeometry.image.x, 2);
    expect(image.y).toBeCloseTo(targetGeometry.image.y, 2);
    expect(image.width).toBeCloseTo(targetGeometry.image.width, 2);
    expect(image.height).toBeCloseTo(targetGeometry.image.height, 2);

    await page.getByTestId("toolbar-export").click();
    await expect(page.getByTestId("export-dialog")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-download-link").click();
    const download = await downloadPromise;

    const outputPath = path.join(os.tmpdir(), `pdf-editor-transform-${Date.now()}.pdf`);
    await download.saveAs(outputPath);

    const inspection = inspectExportedPdf(outputPath);
    const firstPage = inspection.pages[0];
    const expectedRectangleX0 = rectangle.x * firstPage.width;
    const expectedRectangleY0 = rectangle.y * firstPage.height;
    const expectedImageFrame = {
      x0: image.x * firstPage.width,
      y0: image.y * firstPage.height,
      x1: (image.x + image.width) * firstPage.width,
      y1: (image.y + image.height) * firstPage.height,
    };

    const movedDrawing = firstPage.drawingRects.find((rect) => {
      return (
        Math.abs(rect.x0 - expectedRectangleX0) < 35 &&
        Math.abs(rect.y0 - expectedRectangleY0) < 35 &&
        rect.x1 - rect.x0 > createdRectangle.width * firstPage.width * 0.7 &&
        rect.y1 - rect.y0 > createdRectangle.height * firstPage.height * 0.7
      );
    });
    expect(movedDrawing).toBeTruthy();

    const movedImage = firstPage.imageRects.find((rect) => {
      const frameCenterX = (expectedImageFrame.x0 + expectedImageFrame.x1) / 2;
      const frameCenterY = (expectedImageFrame.y0 + expectedImageFrame.y1) / 2;
      const rectCenterX = (rect.x0 + rect.x1) / 2;
      const rectCenterY = (rect.y0 + rect.y1) / 2;
      const rectWidth = rect.x1 - rect.x0;
      const rectHeight = rect.y1 - rect.y0;
      const frameWidth = expectedImageFrame.x1 - expectedImageFrame.x0;
      const frameHeight = expectedImageFrame.y1 - expectedImageFrame.y0;

      return (
        Math.abs(rectCenterX - frameCenterX) < 20 &&
        Math.abs(rectCenterY - frameCenterY) < 20 &&
        rect.x0 >= expectedImageFrame.x0 - 2 &&
        rect.y0 >= expectedImageFrame.y0 - 2 &&
        rect.x1 <= expectedImageFrame.x1 + 2 &&
        rect.y1 <= expectedImageFrame.y1 + 2 &&
        (Math.abs(rectWidth - frameWidth) < 10 || Math.abs(rectHeight - frameHeight) < 10) &&
        rectWidth > frameWidth * 0.55 &&
        rectHeight > frameHeight * 0.45
      );
    });
    expect(movedImage).toBeTruthy();
  });
});
