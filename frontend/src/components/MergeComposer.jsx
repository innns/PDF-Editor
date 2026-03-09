import { useRef } from "react";

import { buildAssetUrl } from "../services/api";

function MergeDraftItem({
  document,
  index,
  total,
  onMove,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
}) {
  return (
    <div
      data-testid="merge-draft-item"
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver(index);
      }}
      onDrop={() => onDrop(index)}
      className="rounded-[24px] border border-white/10 bg-white/5 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-paper-100/50">
            {document.locked ? "Current document" : "Queued PDF"} · {index + 1}
          </p>
          <h3 className="mt-2 text-lg text-paper-50">{document.originalFilename}</h3>
          <p className="mt-2 text-sm text-paper-100/70">{document.pageCount} pages</p>
        </div>
        {document.locked ? (
          <span className="rounded-full border border-tide-400/40 bg-tide-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-tide-200">
            Current
          </span>
        ) : null}
      </div>
      <div className="mt-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-paper-100/45">Page preview</p>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {(document.thumbnails ?? []).slice(0, 4).map((thumbnailUrl, thumbnailIndex) => (
            <div
              key={`${document.id}-preview-${thumbnailIndex}`}
              data-testid="merge-draft-page-preview"
              className="w-24 shrink-0 rounded-2xl border border-white/10 bg-paper-50/95 p-2"
            >
              <img
                src={buildAssetUrl(thumbnailUrl)}
                alt={`${document.originalFilename} preview ${thumbnailIndex + 1}`}
                className="h-28 w-full rounded-xl object-cover"
              />
              <p className="mt-2 text-center text-[11px] uppercase tracking-[0.18em] text-ink-900/70">
                Page {thumbnailIndex + 1}
              </p>
            </div>
          ))}
          {(document.thumbnails ?? []).length === 0 ? (
            <div className="flex h-32 w-24 shrink-0 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 px-2 text-center text-xs text-paper-100/55">
              Preview unavailable
            </div>
          ) : null}
          {(document.thumbnails ?? []).length > 4 ? (
            <div className="flex h-32 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-2 text-center text-xs uppercase tracking-[0.18em] text-paper-100/60">
              +{document.thumbnails.length - 4} more
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="merge-draft-move-up"
          onClick={() => onMove(index, index - 1)}
          disabled={index === 0}
          className="rounded-full border border-white/10 px-3 py-1 text-xs text-paper-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Move Up
        </button>
        <button
          type="button"
          data-testid="merge-draft-move-down"
          onClick={() => onMove(index, index + 1)}
          disabled={index === total - 1}
          className="rounded-full border border-white/10 px-3 py-1 text-xs text-paper-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Move Down
        </button>
        <button
          type="button"
          data-testid="merge-draft-remove"
          onClick={() => onRemove(index)}
          disabled={document.locked}
          className="rounded-full border border-white/10 px-3 py-1 text-xs text-paper-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

export default function MergeComposer({
  fullScreen = false,
  draft,
  busy,
  onConfirm,
  onCancel,
  onMove,
  onRemove,
  onReorder,
}) {
  const dragIndexRef = useRef(null);

  if (!draft) {
    return null;
  }

  const shellClassName = fullScreen
    ? "relative w-full max-w-4xl rounded-[32px] border border-white/10 bg-ink-950/85 p-8 shadow-panel backdrop-blur"
    : "relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[32px] border border-white/10 bg-ink-950 p-8 shadow-panel";

  const wrapperClassName = fullScreen
    ? "relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,106,61,0.25),_transparent_30%),linear-gradient(135deg,_#0f1720,_#16212c_55%,_#213242)] px-6 py-16"
    : "fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/65 px-4 py-6";

  return (
    <div data-testid="merge-draft-panel" className={wrapperClassName}>
      <div className={shellClassName}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-paper-100/60">Merge mode</p>
            <h2 className="mt-2 font-display text-3xl text-paper-50">{draft.title}</h2>
            <p className="mt-3 max-w-2xl text-sm text-paper-100/75">{draft.description}</p>
          </div>
          <button
            type="button"
            data-testid="merge-draft-cancel"
            onClick={onCancel}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-paper-100"
          >
            Cancel
          </button>
        </div>

        <div className="mt-6 rounded-[28px] border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-paper-100/50">Queue</p>
              <p className="mt-2 text-sm text-paper-100/75">
                Drag the cards or use the move buttons. The order here becomes the merge order.
              </p>
            </div>
            <span
              data-testid="merge-draft-count"
              className="rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-paper-100/70"
            >
              {draft.documents.length} PDFs
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {draft.documents.map((document, index) => (
              <MergeDraftItem
                key={document.id}
                document={document}
                index={index}
                total={draft.documents.length}
                onMove={onMove}
                onRemove={onRemove}
                onDragStart={(fromIndex) => {
                  dragIndexRef.current = fromIndex;
                }}
                onDragOver={() => {}}
                onDrop={(toIndex) => {
                  if (dragIndexRef.current === null) {
                    return;
                  }
                  onReorder(dragIndexRef.current, toIndex);
                  dragIndexRef.current = null;
                }}
              />
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-paper-100/65">
            {draft.documents.length > 1
              ? "Confirm to create a merged document in the exact order shown above."
              : "Only one PDF remains. Confirm to open it directly."}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-white/10 px-5 py-3 text-sm text-paper-100"
            >
              Keep Editing
            </button>
            <button
              type="button"
              data-testid="merge-draft-confirm"
              onClick={onConfirm}
              disabled={busy || draft.documents.length === 0}
              className="rounded-full bg-ember-500 px-5 py-3 text-sm font-medium text-paper-50 transition hover:bg-ember-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Preparing..." : draft.documents.length > 1 ? draft.confirmLabel : "Open PDF"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
