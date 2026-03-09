import { useRef } from "react";

import ThumbnailList from "./ThumbnailList";

export default function LeftSidebar({
  pages,
  thumbnails,
  selectedPage,
  onSelectPage,
  onDeletePage,
  onRotatePage,
  onReorderPages,
  rotations
}) {
  const dragIndexRef = useRef(null);

  return (
    <aside data-testid="thumbnail-sidebar" className="w-full max-w-[320px] border-r border-white/10 bg-ink-900/70 p-4">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-paper-100/60">Pages</p>
          <h2 className="mt-2 font-display text-2xl text-paper-50">Document flow</h2>
        </div>
        <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-paper-100/70">{pages.length} active</span>
      </div>
      <div className="max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
        <ThumbnailList
          pages={pages}
          thumbnails={thumbnails}
          selectedPage={selectedPage}
          rotations={rotations}
          onSelectPage={onSelectPage}
          onDeletePage={onDeletePage}
          onRotatePage={onRotatePage}
          onReorder={({ type, index }) => {
            if (type === "start") {
              dragIndexRef.current = index;
              return;
            }
            if (type === "drop" && dragIndexRef.current !== null) {
              onReorderPages(dragIndexRef.current, index);
              dragIndexRef.current = null;
            }
          }}
        />
      </div>
    </aside>
  );
}
