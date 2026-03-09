import { create } from "zustand";

import { cloneSession, pushHistory } from "./historyUtils";
import { getVisiblePages } from "./pageOpsUtils";

function createDefaultSession() {
  return {
    documentId: "",
    zoomState: {
      scale: 1,
      fitMode: "fit-width"
    },
    pageOrder: [],
    deletedPages: [],
    rotatedPages: {},
    annotationsByPage: {},
    historySnapshot: null,
    version: 1,
    updatedAt: null
  };
}

function applyWithHistory(state, updater) {
  const currentSession = cloneSession(state.session);
  const nextSession = updater(cloneSession(state.session));
  return {
    session: nextSession,
    historyPast: pushHistory(state.historyPast, currentSession),
    historyFuture: [],
    isDirty: true
  };
}

export const useEditorStore = create((set) => ({
  documentId: null,
  metadata: null,
  pdfUrl: null,
  thumbnails: [],
  session: createDefaultSession(),
  activeTool: "select",
  selectedPage: null,
  selectedAnnotationId: null,
  pendingImage: null,
  toolSettings: {
    color: "#ff6a3d",
    strokeWidth: 2,
    opacity: 1,
    fillColor: "#ffd089"
  },
  historyPast: [],
  historyFuture: [],
  isDirty: false,
  isSaving: false,
  saveError: null,
  exportInfo: null,
  theme: "dark",
  hydrateDocument: ({ metadata, session, thumbnails, pdfUrl }) =>
    set(() => {
      const firstVisiblePage = getVisiblePages(session)[0] ?? null;
      return {
      documentId: metadata.id,
      metadata,
      session,
      thumbnails,
      pdfUrl,
      activeTool: "select",
      selectedPage: firstVisiblePage,
      selectedAnnotationId: null,
      pendingImage: null,
      historyPast: [],
      historyFuture: [],
      isDirty: false,
      isSaving: false,
      saveError: null,
      exportInfo: null
      };
    }),
  resetDocument: () =>
    set(() => ({
      documentId: null,
      metadata: null,
      pdfUrl: null,
      thumbnails: [],
      session: createDefaultSession(),
      activeTool: "select",
      selectedPage: null,
      selectedAnnotationId: null,
      pendingImage: null,
      historyPast: [],
      historyFuture: [],
      isDirty: false,
      isSaving: false,
      saveError: null,
      exportInfo: null
    })),
  setActiveTool: (activeTool) => set(() => ({ activeTool })),
  setSelectedPage: (selectedPage) => set(() => ({ selectedPage })),
  setSelectedAnnotationId: (selectedAnnotationId) => set(() => ({ selectedAnnotationId })),
  setPendingImage: (pendingImage) => set(() => ({ pendingImage })),
  setToolSetting: (key, value) =>
    set((state) => ({
      toolSettings: {
        ...state.toolSettings,
        [key]: value
      }
    })),
  setZoomState: (zoomState) =>
    set((state) => ({
      session: {
        ...state.session,
        zoomState: {
          ...state.session.zoomState,
          ...zoomState
        },
        updatedAt: new Date().toISOString()
      },
      isDirty: true
    })),
  replaceSession: (session, trackHistory = false) =>
    set((state) => {
      if (!trackHistory) {
        return { session, isDirty: true };
      }
      return {
        session,
        historyPast: pushHistory(state.historyPast, state.session),
        historyFuture: [],
        isDirty: true
      };
    }),
  addAnnotation: (pageIndex, annotation) =>
    set((state) =>
      applyWithHistory(state, (session) => ({
        ...session,
        annotationsByPage: {
          ...session.annotationsByPage,
          [pageIndex]: [...(session.annotationsByPage[pageIndex] ?? []), annotation]
        },
        updatedAt: new Date().toISOString()
      }))
    ),
  updateAnnotation: (pageIndex, annotationId, patch) =>
    set((state) =>
      applyWithHistory(state, (session) => ({
        ...session,
        annotationsByPage: {
          ...session.annotationsByPage,
          [pageIndex]: (session.annotationsByPage[pageIndex] ?? []).map((annotation) =>
            annotation.id === annotationId
              ? {
                  ...annotation,
                  ...patch,
                  updatedAt: new Date().toISOString()
                }
              : annotation
          )
        },
        updatedAt: new Date().toISOString()
      }))
    ),
  removeAnnotation: (pageIndex, annotationId) =>
    set((state) =>
      applyWithHistory(state, (session) => ({
        ...session,
        annotationsByPage: {
          ...session.annotationsByPage,
          [pageIndex]: (session.annotationsByPage[pageIndex] ?? []).filter(
            (annotation) => annotation.id !== annotationId
          )
        },
        updatedAt: new Date().toISOString()
      }))
    ),
  reorderPages: (pageOrder) =>
    set((state) =>
      applyWithHistory(state, (session) => ({
        ...session,
        pageOrder,
        updatedAt: new Date().toISOString()
      }))
    ),
  deletePages: (pages) =>
    set((state) =>
      applyWithHistory(state, (session) => ({
        ...session,
        deletedPages: Array.from(new Set([...(session.deletedPages ?? []), ...pages])).sort((a, b) => a - b),
        updatedAt: new Date().toISOString()
      }))
    ),
  rotatePage: (pageIndex, degrees) =>
    set((state) =>
      applyWithHistory(state, (session) => ({
        ...session,
        rotatedPages: {
          ...session.rotatedPages,
          [pageIndex]: (((session.rotatedPages?.[pageIndex] ?? 0) + degrees) % 360 + 360) % 360
        },
        updatedAt: new Date().toISOString()
      }))
    ),
  undo: () =>
    set((state) => {
      if (state.historyPast.length === 0) {
        return {};
      }
      const previous = state.historyPast[state.historyPast.length - 1];
      const current = cloneSession(state.session);
      return {
        session: previous,
        historyPast: state.historyPast.slice(0, -1),
        historyFuture: [current, ...state.historyFuture],
        isDirty: true,
        selectedAnnotationId: null
      };
    }),
  redo: () =>
    set((state) => {
      if (state.historyFuture.length === 0) {
        return {};
      }
      const [next, ...rest] = state.historyFuture;
      return {
        session: next,
        historyPast: pushHistory(state.historyPast, state.session),
        historyFuture: rest,
        isDirty: true,
        selectedAnnotationId: null
      };
    }),
  markSaving: (isSaving) => set(() => ({ isSaving })),
  markPersisted: () => set(() => ({ isDirty: false, isSaving: false, saveError: null })),
  setSaveError: (saveError) => set(() => ({ isSaving: false, saveError })),
  setExportInfo: (exportInfo) => set(() => ({ exportInfo })),
  clearExportInfo: () => set(() => ({ exportInfo: null })),
  setTheme: (theme) => set(() => ({ theme }))
}));
