import { buildAssetUrl } from "../services/api";

export default function ExportDialog({ exportInfo, onClose }) {
  if (!exportInfo) {
    return null;
  }

  return (
    <div data-testid="export-dialog" className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-ink-900 p-6 shadow-panel">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-paper-100/60">Export ready</p>
            <h3 className="mt-2 font-display text-3xl text-paper-50">Flattened PDF created.</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-white/10 px-3 py-1 text-paper-100">
            Close
          </button>
        </div>
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-paper-100/80">
          <p>File: {exportInfo.filename}</p>
          <p className="mt-2">Size: {(exportInfo.fileSize / 1024).toFixed(1)} KB</p>
          <p className="mt-2 break-all">Path: {exportInfo.storagePath}</p>
        </div>
        <div className="mt-6 flex gap-3">
          <a
            data-testid="export-download-link"
            href={buildAssetUrl(exportInfo.downloadUrl)}
            className="rounded-full bg-ember-500 px-5 py-3 text-sm font-medium text-paper-50 transition hover:bg-ember-400"
            download
          >
            Download export
          </a>
          <a
            href={buildAssetUrl(exportInfo.downloadUrl)}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/10 px-5 py-3 text-sm text-paper-100"
          >
            Open in new tab
          </a>
        </div>
      </div>
    </div>
  );
}
