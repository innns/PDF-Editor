import { useMemo } from "react";

import { useEditorStore } from "../features/editor/editorStore";

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const STEP = 0.15;

export function useZoomPan() {
  const zoomState = useEditorStore((state) => state.session.zoomState);
  const setZoomState = useEditorStore((state) => state.setZoomState);

  const scale = zoomState?.scale ?? 1;
  const fitMode = zoomState?.fitMode ?? "fit-width";

  return useMemo(
    () => ({
      scale,
      fitMode,
      zoomIn() {
        setZoomState({ scale: Math.min(Number((scale + STEP).toFixed(2)), MAX_SCALE), fitMode: "custom" });
      },
      zoomOut() {
        setZoomState({ scale: Math.max(Number((scale - STEP).toFixed(2)), MIN_SCALE), fitMode: "custom" });
      },
      fitWidth() {
        setZoomState({ scale: 1, fitMode: "fit-width" });
      },
      setScale(nextScale) {
        setZoomState({ scale: Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextScale)), fitMode: "custom" });
      }
    }),
    [fitMode, scale, setZoomState]
  );
}
