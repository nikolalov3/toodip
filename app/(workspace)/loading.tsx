/**
 * Shown the instant a tab is clicked, before its data arrives: the shell and
 * sidebar are already on screen (they live in the layout), this fills the
 * content column with quiet placeholders in the page's own rhythm.
 */
export default function WorkspaceLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="animate-pulse">
      <div className="h-6 w-44 rounded-[4px] bg-muted" />
      <div className="mt-2.5 h-3.5 w-80 max-w-full rounded-[4px] bg-muted/70" />
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[84px] rounded-[4px] border border-border bg-card" />
        ))}
      </div>
      <div className="mt-10 h-4 w-56 rounded-[4px] bg-muted" />
      <div className="mt-3.5 h-[260px] rounded-[4px] border border-border bg-card" />
      <div className="mt-10 h-4 w-48 rounded-[4px] bg-muted" />
      <div className="mt-3.5 h-[180px] rounded-[4px] border border-border bg-card" />
    </div>
  );
}
