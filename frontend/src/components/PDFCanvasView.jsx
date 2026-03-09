import { useEffect, useMemo, useRef, useState } from "react";
import { Image as KonvaImage, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import useImage from "use-image";

import {
  createDraftAnnotation,
  createImageAnnotation,
  createTextAnnotation,
  finalizeBoxAnnotation,
  normalizedPoint,
  updateFreehandPath
} from "../features/editor/annotationUtils";
import { getRotationForPage } from "../features/editor/pageOpsUtils";

function ImageShape({ annotation, pageWidth, pageHeight, selected, onSelect, onDragEnd, onTransformEnd, shapeRef }) {
  const [image] = useImage(annotation.imageRef);
  return (
    <KonvaImage
      ref={shapeRef}
      image={image}
      x={annotation.x * pageWidth}
      y={annotation.y * pageHeight}
      width={annotation.width * pageWidth}
      height={annotation.height * pageHeight}
      opacity={annotation.opacity ?? 1}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
      stroke={selected ? "#8ecbd1" : undefined}
      strokeWidth={selected ? 2 : 0}
    />
  );
}

function AnnotationNode({ annotation, pageWidth, pageHeight, selected, onSelect, onDragEnd, onTransformEnd, shapeRef }) {
  const commonProps = {
    ref: shapeRef,
    x: annotation.x * pageWidth,
    y: annotation.y * pageHeight,
    rotation: annotation.rotation ?? 0,
    draggable: annotation.type !== "freehand",
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd,
    onTransformEnd
  };

  if (annotation.type === "text" || annotation.type === "signature") {
    return (
      <Text
        {...commonProps}
        text={annotation.text}
        width={annotation.width * pageWidth}
        height={annotation.height * pageHeight}
        fontSize={annotation.fontSize ?? 18}
        fontFamily={annotation.fontFamily ?? "IBM Plex Sans"}
        fill={annotation.color}
        opacity={annotation.opacity ?? 1}
        fontStyle={annotation.type === "signature" ? "italic" : "normal"}
      />
    );
  }

  if (annotation.type === "highlight") {
    return (
      <Rect
        {...commonProps}
        width={annotation.width * pageWidth}
        height={annotation.height * pageHeight}
        stroke={selected ? "#8ecbd1" : annotation.color}
        strokeWidth={selected ? 2 : 1}
        fill={annotation.color}
        opacity={Math.min(annotation.opacity ?? 0.35, 0.45)}
      />
    );
  }

  if (annotation.type === "rectangle") {
    return (
      <Rect
        {...commonProps}
        width={annotation.width * pageWidth}
        height={annotation.height * pageHeight}
        stroke={selected ? "#8ecbd1" : annotation.color}
        strokeWidth={annotation.strokeWidth ?? 2}
        fill={annotation.fillColor || "transparent"}
        opacity={annotation.opacity ?? 1}
      />
    );
  }

  if (annotation.type === "freehand") {
    return (
      <Line
        ref={shapeRef}
        points={annotation.path.flatMap((point) => [point.x * pageWidth, point.y * pageHeight])}
        stroke={selected ? "#8ecbd1" : annotation.color}
        strokeWidth={annotation.strokeWidth ?? 2}
        opacity={annotation.opacity ?? 1}
        lineCap="round"
        lineJoin="round"
        tension={0.2}
        onClick={onSelect}
        onTap={onSelect}
      />
    );
  }

  if (annotation.type === "image") {
    return (
      <ImageShape
        annotation={annotation}
        pageWidth={pageWidth}
        pageHeight={pageHeight}
        selected={selected}
        onSelect={onSelect}
        onDragEnd={onDragEnd}
        onTransformEnd={onTransformEnd}
        shapeRef={shapeRef}
      />
    );
  }

  return null;
}

function PageEditor({
  pdfDocument,
  pageIndex,
  scale,
  activeTool,
  session,
  selectedAnnotationId,
  pendingImage,
  toolSettings,
  onPageSelect,
  onAnnotationCreate,
  onAnnotationUpdate,
  onAnnotationSelect
}) {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const shapeRefs = useRef({});
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const [draft, setDraft] = useState(null);
  const [renderError, setRenderError] = useState(null);
  const rotation = getRotationForPage(session, pageIndex);
  const annotations = session.annotationsByPage?.[pageIndex] ?? [];

  useEffect(() => {
    if (!wrapperRef.current) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting) {
          setHasBeenVisible(true);
        }
      },
      { rootMargin: "500px 0px" }
    );

    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let active = true;

    async function renderPage() {
      if (!pdfDocument || !canvasRef.current || !(isVisible || hasBeenVisible)) {
        return;
      }
      try {
        const pdfPage = await pdfDocument.getPage(pageIndex + 1);
        const viewport = pdfPage.getViewport({ scale: 1.25 * scale, rotation: (pdfPage.rotate + rotation) % 360 });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        await pdfPage.render({ canvasContext: context, viewport }).promise;
        if (active) {
          setPageSize({ width: viewport.width, height: viewport.height });
        }
      } catch (error) {
        if (active) {
          setRenderError(error.message || "Failed to render page.");
        }
      }
    }

    renderPage();
    return () => {
      active = false;
    };
  }, [hasBeenVisible, isVisible, pageIndex, pdfDocument, rotation, scale]);

  useEffect(() => {
    const selectedNode = shapeRefs.current[selectedAnnotationId];
    if (selectedNode && transformerRef.current) {
      transformerRef.current.nodes([selectedNode]);
      transformerRef.current.getLayer()?.batchDraw();
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedAnnotationId, annotations]);

  const selectedAnnotation = useMemo(
    () => annotations.find((annotation) => annotation.id === selectedAnnotationId),
    [annotations, selectedAnnotationId]
  );

  function pointerToNormalized() {
    const stage = stageRef.current;
    if (!stage || !pageSize.width || !pageSize.height) {
      return null;
    }
    const pointer = stage.getPointerPosition();
    if (!pointer) {
      return null;
    }
    return normalizedPoint(pointer, pageSize.width, pageSize.height);
  }

  function commitDraft(finalDraft) {
    if (!finalDraft) {
      return;
    }
    if (finalDraft.type === "freehand" && finalDraft.path.length < 2) {
      setDraft(null);
      return;
    }
    onAnnotationCreate(pageIndex, finalDraft);
    onAnnotationSelect(finalDraft.id);
    setDraft(null);
  }

  function handleMouseDown() {
    onPageSelect(pageIndex);
    const point = pointerToNormalized();
    if (!point) {
      return;
    }
    if (activeTool === "rectangle" || activeTool === "highlight") {
      setDraft(
        createDraftAnnotation({
          type: activeTool,
          page: pageIndex,
          start: point,
          color: toolSettings.color,
          strokeWidth: toolSettings.strokeWidth,
          opacity: toolSettings.opacity,
          fillColor: activeTool === "rectangle" ? toolSettings.fillColor : toolSettings.color
        })
      );
      return;
    }
    if (activeTool === "freehand") {
      const annotation = createDraftAnnotation({
        type: "freehand",
        page: pageIndex,
        start: point,
        color: toolSettings.color,
        strokeWidth: toolSettings.strokeWidth,
        opacity: toolSettings.opacity,
        fillColor: null
      });
      setDraft({ ...annotation, path: [point] });
    }
  }

  function handleMouseMove() {
    const point = pointerToNormalized();
    if (!point || !draft) {
      return;
    }
    if (draft.type === "freehand") {
      setDraft((current) => updateFreehandPath(current, point));
      return;
    }
    setDraft((current) => finalizeBoxAnnotation(current, point));
  }

  function handleMouseUp() {
    if (!draft) {
      return;
    }
    commitDraft(draft.type === "freehand" ? draft : finalizeBoxAnnotation(draft, pointerToNormalized() ?? { x: draft.x, y: draft.y }));
  }

  function handleClickStage(event) {
    onPageSelect(pageIndex);
    if (event.target !== event.target.getStage()) {
      return;
    }
    const point = pointerToNormalized();
    if (!point) {
      return;
    }
    if (activeTool === "select") {
      onAnnotationSelect(null);
      return;
    }
    if (activeTool === "text") {
      const text = window.prompt("Enter text annotation");
      if (text) {
        const annotation = createTextAnnotation({
          type: "text",
          page: pageIndex,
          point,
          text,
          color: toolSettings.color,
          opacity: toolSettings.opacity
        });
        commitDraft(annotation);
      }
      return;
    }
    if (activeTool === "signature") {
      const text = window.prompt("Enter signature name");
      if (text) {
        const annotation = createTextAnnotation({
          type: "signature",
          page: pageIndex,
          point,
          text,
          color: toolSettings.color,
          opacity: toolSettings.opacity
        });
        commitDraft(annotation);
      }
      return;
    }
    if (activeTool === "image" && pendingImage) {
      const annotation = createImageAnnotation({ page: pageIndex, point, imageRef: pendingImage });
      commitDraft(annotation);
    }
  }

  function handleDragEnd(annotation, event) {
    const node = event.target;
    onAnnotationUpdate(pageIndex, annotation.id, {
      x: node.x() / pageSize.width,
      y: node.y() / pageSize.height
    });
  }

  function handleTransformEnd(annotation) {
    const node = shapeRefs.current[annotation.id];
    if (!node) {
      return;
    }
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    onAnnotationUpdate(pageIndex, annotation.id, {
      x: node.x() / pageSize.width,
      y: node.y() / pageSize.height,
      width: Math.max(0.02, (node.width() * scaleX) / pageSize.width),
      height: Math.max(0.02, (node.height() * scaleY) / pageSize.height)
    });
  }

  return (
    <section
      ref={wrapperRef}
      data-testid="page-editor"
      className="mx-auto mb-8 w-full max-w-fit scroll-mt-24"
      onClick={() => onPageSelect(pageIndex)}
    >
      <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.25em] text-paper-100/60">
        <span>Page {pageIndex + 1}</span>
        <span>{rotation}°</span>
      </div>
      <div className="relative rounded-[28px] border border-white/10 bg-white/10 p-3 shadow-panel">
        <canvas ref={canvasRef} className="block rounded-2xl bg-paper-50" />
        {pageSize.width > 0 ? (
          <Stage
            ref={stageRef}
            data-testid="page-stage"
            width={pageSize.width}
            height={pageSize.height}
            className="absolute left-3 top-3"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handleClickStage}
          >
            <Layer>
              {annotations.map((annotation) => (
                <AnnotationNode
                  key={annotation.id}
                  annotation={annotation}
                  pageWidth={pageSize.width}
                  pageHeight={pageSize.height}
                  selected={annotation.id === selectedAnnotationId}
                  shapeRef={(node) => {
                    if (node) {
                      shapeRefs.current[annotation.id] = node;
                    }
                  }}
                  onSelect={() => onAnnotationSelect(annotation.id)}
                  onDragEnd={(event) => handleDragEnd(annotation, event)}
                  onTransformEnd={() => handleTransformEnd(annotation)}
                />
              ))}
              {draft ? (
                <AnnotationNode
                  annotation={draft}
                  pageWidth={pageSize.width}
                  pageHeight={pageSize.height}
                  selected={false}
                  shapeRef={() => {}}
                  onSelect={() => {}}
                  onDragEnd={() => {}}
                  onTransformEnd={() => {}}
                />
              ) : null}
              {selectedAnnotation && selectedAnnotation.type !== "freehand" ? (
                <Transformer
                  ref={transformerRef}
                  rotateEnabled={false}
                  enabledAnchors={[
                    "top-left",
                    "top-right",
                    "bottom-left",
                    "bottom-right"
                  ]}
                  boundBoxFunc={(oldBox, newBox) => {
                    if (newBox.width < 20 || newBox.height < 20) {
                      return oldBox;
                    }
                    return newBox;
                  }}
                />
              ) : null}
            </Layer>
          </Stage>
        ) : null}
        {renderError ? <p className="mt-3 text-sm text-amber-200">{renderError}</p> : null}
      </div>
    </section>
  );
}

export default function PDFCanvasView({
  pdfDocument,
  pages,
  scale,
  activeTool,
  session,
  selectedAnnotationId,
  pendingImage,
  toolSettings,
  onPageSelect,
  onAnnotationCreate,
  onAnnotationUpdate,
  onAnnotationSelect
}) {
  return (
    <div data-testid="pdf-canvas-view" className="min-h-[calc(100vh-176px)] flex-1 overflow-y-auto px-6 py-6">
      {pages.length === 0 ? (
        <div className="flex h-full items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-white/5 p-12 text-paper-100/70">
          All pages are marked deleted. Undo or reload the session to continue.
        </div>
      ) : null}
      {pages.map((pageIndex) => (
        <PageEditor
          key={pageIndex}
          pdfDocument={pdfDocument}
          pageIndex={pageIndex}
          scale={scale}
          activeTool={activeTool}
          session={session}
          selectedAnnotationId={selectedAnnotationId}
          pendingImage={pendingImage}
          toolSettings={toolSettings}
          onPageSelect={onPageSelect}
          onAnnotationCreate={onAnnotationCreate}
          onAnnotationUpdate={onAnnotationUpdate}
          onAnnotationSelect={onAnnotationSelect}
        />
      ))}
    </div>
  );
}
