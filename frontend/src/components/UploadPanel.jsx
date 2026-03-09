export default function UploadPanel({ onUpload, busy, error }) {
  return (
    <div
      data-testid="upload-panel"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,106,61,0.25),_transparent_30%),linear-gradient(135deg,_#0f1720,_#16212c_55%,_#213242)] px-6 py-16"
    >
      <div className="absolute inset-x-0 top-0 h-52 bg-[radial-gradient(circle_at_center,_rgba(87,175,184,0.2),_transparent_60%)]" />
      <div className="relative w-full max-w-3xl rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-panel backdrop-blur">
        <p className="font-display text-sm uppercase tracking-[0.35em] text-paper-200">Self-hosted PDF workspace</p>
        <h1 className="mt-4 max-w-2xl font-display text-5xl text-paper-50">Edit, annotate, reorder, and export PDFs without leaving the browser.</h1>
        <p className="mt-6 max-w-2xl text-lg text-paper-100/80">
          Upload one or more PDFs to start a session. The original files remain immutable while edits are stored separately and flattened only when you export.
        </p>
        <label className="mt-10 flex cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed border-paper-100/30 bg-ink-900/70 px-8 py-16 text-center transition hover:border-ember-400 hover:bg-ink-800/80">
          <input
            data-testid="upload-input"
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              if (files.length > 0) {
                onUpload(files);
              }
              event.target.value = "";
            }}
          />
          <span className="rounded-full bg-ember-500/20 px-4 py-2 text-sm uppercase tracking-[0.3em] text-ember-400">Upload PDFs</span>
          <span className="mt-5 text-xl text-paper-50">Drop into a focused editing surface with thumbnails, annotations, and export.</span>
          <span className="mt-2 text-sm text-paper-100/70">PDF only, up to the configured backend upload size.</span>
        </label>
        {busy ? <p className="mt-4 text-sm text-tide-300">Uploading PDFs and preparing the workspace...</p> : null}
        {error ? <p className="mt-4 text-sm text-amber-200">{error}</p> : null}
      </div>
    </div>
  );
}
