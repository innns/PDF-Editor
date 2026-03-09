export default function AnnotationToolbar({ toolSettings, onToolSettingChange }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-3">
      <label className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-paper-100/70">
        Color
        <input
          type="color"
          value={toolSettings.color}
          onChange={(event) => onToolSettingChange("color", event.target.value)}
          className="h-9 w-12 rounded border border-white/10 bg-transparent"
        />
      </label>
      <label className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-paper-100/70">
        Fill
        <input
          type="color"
          value={toolSettings.fillColor}
          onChange={(event) => onToolSettingChange("fillColor", event.target.value)}
          className="h-9 w-12 rounded border border-white/10 bg-transparent"
        />
      </label>
      <label className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-paper-100/70">
        Stroke
        <input
          type="range"
          min="1"
          max="12"
          value={toolSettings.strokeWidth}
          onChange={(event) => onToolSettingChange("strokeWidth", Number(event.target.value))}
          className="accent-ember-500"
        />
        <span className="w-6 text-right text-paper-50">{toolSettings.strokeWidth}</span>
      </label>
      <label className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-paper-100/70">
        Opacity
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.1"
          value={toolSettings.opacity}
          onChange={(event) => onToolSettingChange("opacity", Number(event.target.value))}
          className="accent-tide-400"
        />
        <span className="w-8 text-right text-paper-50">{Math.round(toolSettings.opacity * 100)}%</span>
      </label>
    </div>
  );
}
