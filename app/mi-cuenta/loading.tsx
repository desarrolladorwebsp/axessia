export default function PortalLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="h-24 animate-pulse rounded-2xl bg-white" />
      <div className="h-48 animate-pulse rounded-2xl bg-white" />
      <p className="sr-only">Cargando tu portal…</p>
    </div>
  );
}
