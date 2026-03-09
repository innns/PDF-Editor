import { useEffect, useState } from "react";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/build/pdf.mjs";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorker;

export function usePdfDocument(pdfUrl) {
  const [pdfDocument, setPdfDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    let loadingTask = null;

    async function loadDocument() {
      if (!pdfUrl) {
        setPdfDocument(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        loadingTask = getDocument({ url: pdfUrl, withCredentials: false });
        const loaded = await loadingTask.promise;
        if (mounted) {
          setPdfDocument(loaded);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError.message || "Failed to load the PDF document.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDocument();

    return () => {
      mounted = false;
      if (loadingTask) {
        loadingTask.destroy();
      }
    };
  }, [pdfUrl]);

  return {
    pdfDocument,
    loading,
    error,
    pageCount: pdfDocument?.numPages ?? 0
  };
}
