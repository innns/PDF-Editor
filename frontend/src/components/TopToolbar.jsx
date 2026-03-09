import { useRef } from "react";

const TOOLS = [
  ["select", "Select"],
  ["text", "Text"],
  ["highlight", "Highlight"],
  ["rectangle", "Rectangle"],
  ["freehand", "Freehand"],
  ["signature", "Signature"],
  ["image", "Image"]
];

function ToolbarButton({ children, active = false, onClick, disabled = false, testId }) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-4 py-2 text-sm transition ${
        active
          ? "border-ember-400 bg-ember-500/20 text-paper-50"
          : "border-white/10 bg-white/5 text-paper-100 hover:border-white/20 hover:bg-white/10"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      {children}
    </button>
  );
}

export default function TopToolbar({
  activeTool,
  onToolChange,
  onUpload,
  onMerge,
  onImageSelected,
  onUndo,
  onRedo,
  onDeletePage,
  onRotatePage,
  onSplit,
  onExport,
  onZoomIn,
  onZoomOut,
  onFitWidth,
  onToggleTheme,
  theme,
  canUndo,
  canRedo,
  disabled,
  scale,
  selectedPage,
  exporting
}) {
  const uploadRef = useRef(null);
  const mergeRef = useRef(null);
  const imageRef = useRef(null);

  return (
    <div className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/85 px-4 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <ToolbarButton testId="toolbar-upload" onClick={() => uploadRef.current?.click()} disabled={disabled}>Upload</ToolbarButton>
        <ToolbarButton testId="toolbar-merge" onClick={() => mergeRef.current?.click()} disabled={disabled}>Merge</ToolbarButton>
        <input
          data-testid="toolbar-upload-input"
          ref={uploadRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length) {
              onUpload(files);
            }
            event.target.value = "";
          }}
        />
        <input
          data-testid="toolbar-merge-input"
          ref={mergeRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length) {
              onMerge(files);
            }
            event.target.value = "";
          }}
        />
        <input
          data-testid="toolbar-image-input"
          ref={imageRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              onImageSelected(file);
            }
            event.target.value = "";
          }}
        />
        <div className="h-8 w-px bg-white/10" />
        {TOOLS.map(([toolKey, label]) => (
          <ToolbarButton
            key={toolKey}
            testId={`tool-${toolKey}`}
            active={activeTool === toolKey}
            onClick={() => {
              if (toolKey === "image") {
                imageRef.current?.click();
              }
              onToolChange(toolKey);
            }}
            disabled={disabled}
          >
            {label}
          </ToolbarButton>
        ))}
        <div className="h-8 w-px bg-white/10" />
        <ToolbarButton testId="toolbar-undo" onClick={onUndo} disabled={disabled || !canUndo}>Undo</ToolbarButton>
        <ToolbarButton testId="toolbar-redo" onClick={onRedo} disabled={disabled || !canRedo}>Redo</ToolbarButton>
        <ToolbarButton testId="toolbar-delete-page" onClick={onDeletePage} disabled={disabled || selectedPage === null}>Delete Page</ToolbarButton>
        <ToolbarButton testId="toolbar-rotate-page" onClick={onRotatePage} disabled={disabled || selectedPage === null}>Rotate</ToolbarButton>
        <ToolbarButton testId="toolbar-split" onClick={onSplit} disabled={disabled || selectedPage === null}>Split</ToolbarButton>
        <ToolbarButton testId="toolbar-export" onClick={onExport} disabled={disabled || exporting}>{exporting ? "Exporting..." : "Export"}</ToolbarButton>
        <div className="ml-auto flex items-center gap-2">
          <ToolbarButton testId="toolbar-zoom-out" onClick={onZoomOut} disabled={disabled}>-</ToolbarButton>
          <span data-testid="zoom-indicator" className="w-16 text-center text-sm text-paper-100">{Math.round(scale * 100)}%</span>
          <ToolbarButton testId="toolbar-zoom-in" onClick={onZoomIn} disabled={disabled}>+</ToolbarButton>
          <ToolbarButton testId="toolbar-fit-width" onClick={onFitWidth} disabled={disabled}>Fit Width</ToolbarButton>
          <ToolbarButton testId="toolbar-toggle-theme" onClick={onToggleTheme}>{theme === "dark" ? "Light" : "Dark"}</ToolbarButton>
        </div>
      </div>
    </div>
  );
}
