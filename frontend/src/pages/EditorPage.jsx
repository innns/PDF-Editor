import { useEffect, useMemo, useState } from "react";

import AnnotationToolbar from "../components/AnnotationToolbar";
import ExportDialog from "../components/ExportDialog";
import LeftSidebar from "../components/LeftSidebar";
import MergeComposer from "../components/MergeComposer";
import PDFCanvasView from "../components/PDFCanvasView";
import TopToolbar from "../components/TopToolbar";
import UploadPanel from "../components/UploadPanel";
import { dataUrlFromFile } from "../features/editor/annotationUtils";
import { useEditorStore } from "../features/editor/editorStore";
import { getVisiblePages, mergeVisibleOrderWithDeleted, moveArrayItem } from "../features/editor/pageOpsUtils";
import { useAnnotations } from "../hooks/useAnnotations";
import { usePdfDocument } from "../hooks/usePdfDocument";
import { useZoomPan } from "../hooks/useZoomPan";
import { api } from "../services/api";

export default function EditorPage() {
  const {
    documentId,
    metadata,
    pdfUrl,
    thumbnails,
    session,
    activeTool,
    selectedPage,
    selectedAnnotationId,
    pendingImage,
    toolSettings,
    historyPast,
    historyFuture,
    isDirty,
    isSaving,
    saveError,
    exportInfo,
    theme,
    hydrateDocument,
    setActiveTool,
    setSelectedPage,
    setSelectedAnnotationId,
    setPendingImage,
    setToolSetting,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    reorderPages,
    deletePages,
    rotatePage,
    undo,
    redo,
    markSaving,
    markPersisted,
    setSaveError,
    setExportInfo,
    clearExportInfo,
    setTheme
  } = useEditorStore();

  const [screenError, setScreenError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [mergeDraft, setMergeDraft] = useState(null);

  const visiblePages = useMemo(() => getVisiblePages(session), [session]);
  const selectedAnnotationPage = useMemo(() => {
    if (!selectedAnnotationId) {
      return null;
    }
    const entry = Object.entries(session.annotationsByPage ?? {}).find(([, annotations]) =>
      annotations.some((annotation) => annotation.id === selectedAnnotationId)
    );
    return entry ? Number(entry[0]) : null;
  }, [selectedAnnotationId, session.annotationsByPage]);
  const { pdfDocument, loading: pdfLoading, error: pdfError } = usePdfDocument(pdfUrl);
  const { scale, zoomIn, zoomOut, fitWidth } = useZoomPan();

  useAnnotations({
    documentId,
    session,
    isDirty,
    onSaving: markSaving,
    onSaved: markPersisted,
    onError: setSaveError
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    window.__PDF_EDITOR_E2E__ = {
      getState: () => useEditorStore.getState(),
      updateAnnotationGeometry: (pageIndex, annotationId, patch) =>
        useEditorStore.getState().updateAnnotation(pageIndex, annotationId, patch)
    };

    return () => {
      delete window.__PDF_EDITOR_E2E__;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      const isModifier = event.metaKey || event.ctrlKey;
      if (isModifier && event.key.toLowerCase() === "z" && event.shiftKey) {
        event.preventDefault();
        redo();
        return;
      }
      if (isModifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
        return;
      }
      if (isModifier && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if (event.key === "Delete" && selectedAnnotationId && selectedAnnotationPage !== null) {
        event.preventDefault();
        removeAnnotation(selectedAnnotationPage, selectedAnnotationId);
        setSelectedAnnotationId(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [redo, removeAnnotation, selectedAnnotationId, selectedAnnotationPage, setSelectedAnnotationId, undo]);

  useEffect(() => {
    const nextSelectedPage = visiblePages[0] ?? null;
    if (selectedPage !== null && visiblePages.includes(selectedPage)) {
      return;
    }
    if (selectedPage === nextSelectedPage) {
      return;
    }
    setSelectedPage(nextSelectedPage);
  }, [selectedPage, setSelectedPage, visiblePages]);

  async function loadDocument(nextDocumentId) {
    setBusy(true);
    setScreenError(null);
    try {
      const [metadataResponse, sessionResponse, thumbnailsResponse] = await Promise.all([
        api.getDocumentMetadata(nextDocumentId),
        api.getDocumentSession(nextDocumentId),
        api.getDocumentThumbnails(nextDocumentId)
      ]);

      hydrateDocument({
        metadata: metadataResponse,
        session: sessionResponse.session,
        thumbnails: thumbnailsResponse.thumbnails,
        pdfUrl: api.getDocumentFileUrl(nextDocumentId)
      });
    } catch (error) {
      setScreenError(error.message || "Failed to load document.");
    } finally {
      setBusy(false);
    }
  }

  async function syncSessionFromServer(nextDocumentId = documentId) {
    if (!nextDocumentId || !metadata || !pdfUrl) {
      return;
    }
    const [sessionResponse, thumbnailsResponse] = await Promise.all([
      api.getDocumentSession(nextDocumentId),
      api.getDocumentThumbnails(nextDocumentId)
    ]);
    hydrateDocument({
      metadata,
      session: sessionResponse.session,
      thumbnails: thumbnailsResponse.thumbnails,
      pdfUrl
    });
  }

  async function handleUpload(files) {
    setBusy(true);
    setScreenError(null);
    try {
      const response = await api.uploadFiles(files);
      const uploadedDocuments = response.documents ?? [];
      const firstDocument = uploadedDocuments[0];
      if (!firstDocument) {
        throw new Error("No document was returned from upload.");
      }
      if (uploadedDocuments.length === 1) {
        await loadDocument(firstDocument.id);
        return;
      }
      const draftDocuments = await Promise.all(
        uploadedDocuments.map(async (document) => {
          const thumbnailsResponse = await api.getDocumentThumbnails(document.id);
          return {
            id: document.id,
            originalFilename: document.originalFilename,
            pageCount: document.pageCount,
            locked: false,
            thumbnails: thumbnailsResponse.thumbnails ?? []
          };
        })
      );
      setMergeDraft({
        title: "Arrange PDFs before merging",
        description: "Multiple PDFs were uploaded together. Reorder them here before creating the merged document.",
        confirmLabel: "Merge PDFs",
        documents: draftDocuments,
        fullScreen: !documentId
      });
      setBusy(false);
    } catch (error) {
      setScreenError(error.message || "Upload failed.");
      setBusy(false);
    }
  }

  async function handleMerge(files) {
    setBusy(true);
    setScreenError(null);
    try {
      const uploadResponse = await api.uploadFiles(files);
      const uploadedDocuments = uploadResponse.documents ?? [];
      const uploadedDraftDocuments = await Promise.all(
        uploadedDocuments.map(async (document) => {
          const thumbnailsResponse = await api.getDocumentThumbnails(document.id);
          return {
            id: document.id,
            originalFilename: document.originalFilename,
            pageCount: document.pageCount,
            locked: false,
            thumbnails: thumbnailsResponse.thumbnails ?? []
          };
        })
      );
      const draftDocuments = [
        ...(documentId && metadata
          ? [
              {
                id: documentId,
                originalFilename: metadata.originalFilename,
                pageCount: metadata.pageCount,
                locked: true,
                thumbnails
              }
            ]
          : []),
        ...uploadedDraftDocuments
      ];
      if (draftDocuments.length < 2) {
        throw new Error("Merge requires the current document plus at least one additional PDF.");
      }
      setMergeDraft({
        title: "Merge the current document with uploaded PDFs",
        description: "Adjust the order below before the backend creates the merged PDF.",
        confirmLabel: "Create merged document",
        documents: draftDocuments,
        fullScreen: false
      });
      setBusy(false);
    } catch (error) {
      setScreenError(error.message || "Merge failed.");
      setBusy(false);
    }
  }

  function reorderMergeDraft(fromIndex, toIndex) {
    setMergeDraft((current) => {
      if (!current || fromIndex === toIndex || toIndex < 0 || toIndex >= current.documents.length) {
        return current;
      }
      return {
        ...current,
        documents: moveArrayItem(current.documents, fromIndex, toIndex)
      };
    });
  }

  function removeMergeDraftDocument(index) {
    setMergeDraft((current) => {
      if (!current) {
        return current;
      }
      const nextDocuments = current.documents.filter((_, candidateIndex) => candidateIndex !== index);
      return {
        ...current,
        documents: nextDocuments
      };
    });
  }

  async function confirmMergeDraft() {
    if (!mergeDraft) {
      return;
    }
    if (mergeDraft.documents.length === 0) {
      setScreenError("Merge queue is empty.");
      return;
    }

    setBusy(true);
    setScreenError(null);

    try {
      if (mergeDraft.documents.length === 1) {
        const onlyDocument = mergeDraft.documents[0];
        setMergeDraft(null);
        if (onlyDocument.id === documentId) {
          setBusy(false);
          return;
        }
        await loadDocument(onlyDocument.id);
        return;
      }

      const mergeResponse = await api.mergeDocuments(mergeDraft.documents.map((document) => document.id));
      setMergeDraft(null);
      await loadDocument(mergeResponse.document.id);
    } catch (error) {
      setScreenError(error.message || "Merge failed.");
      setBusy(false);
    }
  }

  async function handleImageSelected(file) {
    try {
      const imageRef = await dataUrlFromFile(file);
      setPendingImage(imageRef);
      setActiveTool("image");
    } catch (error) {
      setScreenError(error.message || "Failed to load the image.");
    }
  }


  async function handleReorderPages(fromIndex, toIndex) {
    if (fromIndex === toIndex) {
      return;
    }
    const nextVisibleOrder = moveArrayItem(visiblePages, fromIndex, toIndex);
    const nextPageOrder = mergeVisibleOrderWithDeleted(session.pageOrder, session.deletedPages, nextVisibleOrder);
    reorderPages(nextPageOrder);
    try {
      await api.reorderPages(documentId, nextPageOrder);
      markPersisted();
    } catch (error) {
      setSaveError(error.message || "Failed to save page order.");
      await syncSessionFromServer();
    }
  }

  async function handleDeletePage(pageIndex) {
    if (pageIndex === null || pageIndex === undefined) {
      return;
    }
    if (visiblePages.length === 1) {
      setScreenError("The last remaining page cannot be deleted.");
      return;
    }
    deletePages([pageIndex]);
    if (selectedPage === pageIndex) {
      setSelectedPage(visiblePages.find((page) => page !== pageIndex) ?? null);
    }
    try {
      await api.deletePages(documentId, [pageIndex]);
      markPersisted();
    } catch (error) {
      setSaveError(error.message || "Failed to delete page.");
      await syncSessionFromServer();
    }
  }

  async function handleRotatePage(pageIndex = selectedPage) {
    if (pageIndex === null || pageIndex === undefined) {
      return;
    }
    rotatePage(pageIndex, 90);
    try {
      await api.rotatePage(documentId, pageIndex, 90);
      markPersisted();
    } catch (error) {
      setSaveError(error.message || "Failed to rotate page.");
      await syncSessionFromServer();
    }
  }

  async function handleSplit() {
    if (!documentId) {
      return;
    }
    const input = window.prompt("Enter page numbers to split into separate documents, separated by commas.", "1,2");
    if (!input) {
      return;
    }
    const pages = input
      .split(",")
      .map((value) => Number(value.trim()) - 1)
      .filter((value) => Number.isInteger(value) && value >= 0);
    if (pages.length === 0) {
      setScreenError("Split requires at least one valid page number.");
      return;
    }
    setBusy(true);
    setScreenError(null);
    try {
      const response = await api.splitDocument(documentId, pages);
      if (response.documents[0]) {
        await loadDocument(response.documents[0].id);
      }
    } catch (error) {
      setScreenError(error.message || "Split failed.");
      setBusy(false);
    }
  }

  async function handleExport() {
    if (!documentId) {
      return;
    }
    setExporting(true);
    setScreenError(null);
    try {
      await api.saveSession(documentId, session);
      const response = await api.exportDocument(documentId);
      setExportInfo(response.export);
      markPersisted();
    } catch (error) {
      setScreenError(error.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  if (!documentId && !mergeDraft) {
    return <UploadPanel onUpload={handleUpload} busy={busy} error={screenError} />;
  }

  if (!documentId && mergeDraft) {
    return (
      <MergeComposer
        fullScreen
        draft={mergeDraft}
        busy={busy}
        onConfirm={confirmMergeDraft}
        onCancel={() => setMergeDraft(null)}
        onMove={reorderMergeDraft}
        onRemove={removeMergeDraftDocument}
        onReorder={reorderMergeDraft}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_rgba(15,23,32,1)_0%,_rgba(22,33,44,1)_55%,_rgba(18,26,34,1)_100%)] text-paper-50">
      <TopToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onUpload={handleUpload}
        onMerge={handleMerge}
        onImageSelected={handleImageSelected}
        onUndo={undo}
        onRedo={redo}
        onDeletePage={() => handleDeletePage(selectedPage)}
        onRotatePage={() => handleRotatePage(selectedPage)}
        onSplit={handleSplit}
        onExport={handleExport}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFitWidth={fitWidth}
        onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        theme={theme}
        canUndo={historyPast.length > 0}
        canRedo={historyFuture.length > 0}
        disabled={busy || Boolean(mergeDraft)}
        scale={scale}
        selectedPage={selectedPage}
        exporting={exporting}
      />
      <div className="grid min-h-[calc(100vh-72px)] grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)]">
        <LeftSidebar
          pages={visiblePages}
          thumbnails={thumbnails}
          selectedPage={selectedPage}
          onSelectPage={setSelectedPage}
          onDeletePage={handleDeletePage}
          onRotatePage={handleRotatePage}
          onReorderPages={handleReorderPages}
          rotations={session.rotatedPages}
        />
        <main className="flex min-h-0 flex-col">
          <div className="flex flex-wrap items-center gap-4 border-b border-white/10 px-6 py-4">
            <span data-testid="document-id" className="hidden">
              {documentId}
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-paper-100/60">Current document</p>
              <h2 data-testid="document-title" className="mt-2 font-display text-3xl text-paper-50">
                {metadata?.originalFilename}
              </h2>
            </div>
            <div
              data-testid="source-pages-count"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-paper-100/70"
            >
              {metadata?.pageCount} source pages
            </div>
            <div
              data-testid="active-pages-count"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-paper-100/70"
            >
              {visiblePages.length} active pages
            </div>
            {isSaving ? <span className="text-sm text-tide-300">Saving session...</span> : null}
            {isDirty && !isSaving ? <span className="text-sm text-paper-100/70">Unsaved local changes</span> : null}
            {saveError ? <span className="text-sm text-amber-200">{saveError}</span> : null}
          </div>
          <div className="border-b border-white/10 px-6 py-4">
            <AnnotationToolbar toolSettings={toolSettings} onToolSettingChange={setToolSetting} />
          </div>
          {screenError ? <div className="px-6 pt-4 text-sm text-amber-200">{screenError}</div> : null}
          {pdfError ? <div className="px-6 pt-4 text-sm text-amber-200">{pdfError}</div> : null}
          {pdfLoading ? <div className="px-6 pt-4 text-sm text-tide-300">Loading PDF viewer...</div> : null}
          <PDFCanvasView
            pdfDocument={pdfDocument}
            pages={visiblePages}
            scale={scale}
            activeTool={activeTool}
            session={session}
            selectedAnnotationId={selectedAnnotationId}
            pendingImage={pendingImage}
            toolSettings={toolSettings}
            onPageSelect={setSelectedPage}
            onAnnotationCreate={addAnnotation}
            onAnnotationUpdate={updateAnnotation}
            onAnnotationSelect={setSelectedAnnotationId}
          />
        </main>
      </div>
      <ExportDialog exportInfo={exportInfo} onClose={clearExportInfo} />
      <MergeComposer
        draft={mergeDraft}
        fullScreen={Boolean(mergeDraft?.fullScreen)}
        busy={busy}
        onConfirm={confirmMergeDraft}
        onCancel={() => setMergeDraft(null)}
        onMove={reorderMergeDraft}
        onRemove={removeMergeDraftDocument}
        onReorder={reorderMergeDraft}
      />
    </div>
  );
}
