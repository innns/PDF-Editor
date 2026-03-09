function ThumbnailItem({
  pageIndex,
  visibleIndex,
  thumbnailUrl,
  active,
  rotation,
  onSelect,
  onDelete,
  onRotate,
  onDragStart,
  onDragOver,
  onDrop
}) {
  return (
    <div
      data-testid="thumbnail-item"
      draggable
      onDragStart={() => onDragStart(visibleIndex)}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver(visibleIndex);
      }}
      onDrop={() => onDrop(visibleIndex)}
      className={`group w-full rounded-2xl border p-3 text-left transition ${
        active ? "border-ember-400 bg-ember-500/10" : "border-white/10 bg-white/5 hover:border-white/20"
      }`}
    >
      <button type="button" onClick={() => onSelect(pageIndex)} className="block w-full text-left">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-paper-100/70">
          <span>Page {pageIndex + 1}</span>
          <span>{rotation}°</span>
        </div>
        <div className="mt-3 overflow-hidden rounded-xl bg-paper-50/95 p-2">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt={`Thumbnail for page ${pageIndex + 1}`} className="w-full rounded-md" />
          ) : (
            <div className="flex h-32 items-center justify-center rounded-md bg-paper-100 text-ink-900">
              No preview
            </div>
          )}
        </div>
      </button>
      <div className="mt-3 flex gap-2 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          className="rounded-full border border-white/10 px-3 py-1 text-xs text-paper-100"
          onClick={(event) => {
            event.stopPropagation();
            onRotate(pageIndex);
          }}
        >
          Rotate
        </button>
        <button
          type="button"
          className="rounded-full border border-white/10 px-3 py-1 text-xs text-paper-100"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(pageIndex);
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function ThumbnailList({
  pages,
  thumbnails,
  selectedPage,
  onSelectPage,
  onDeletePage,
  onRotatePage,
  onReorder,
  rotations
}) {
  return (
    <div className="space-y-3">
      {pages.map((pageIndex, visibleIndex) => (
        <ThumbnailItem
          key={pageIndex}
          pageIndex={pageIndex}
          visibleIndex={visibleIndex}
          thumbnailUrl={thumbnails[pageIndex]}
          active={selectedPage === pageIndex}
          rotation={Number(rotations?.[pageIndex] ?? 0)}
          onSelect={onSelectPage}
          onDelete={onDeletePage}
          onRotate={onRotatePage}
          onDragStart={(fromIndex) => onReorder({ type: "start", index: fromIndex })}
          onDragOver={(overIndex) => onReorder({ type: "over", index: overIndex })}
          onDrop={(toIndex) => onReorder({ type: "drop", index: toIndex })}
        />
      ))}
    </div>
  );
}
