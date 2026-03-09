import { useEffect, useRef } from "react";

import { api } from "../services/api";

export function useAnnotations({ documentId, session, isDirty, onSaving, onSaved, onError }) {
  const latestSessionRef = useRef(session);

  useEffect(() => {
    latestSessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (!documentId || !isDirty) {
      return undefined;
    }

    const timeout = window.setTimeout(async () => {
      try {
        onSaving(true);
        await api.patchSession(documentId, latestSessionRef.current);
        onSaved();
      } catch (error) {
        onError(error.message || "Autosave failed.");
      }
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [documentId, isDirty, onError, onSaved, onSaving, session]);
}
