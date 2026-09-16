import Link from "next/link";

export function PortalPagination({
  page,
  pages,
  total,
  shown,
  itemLabel,
  href,
}: {
  page: number;
  pages: number;
  total: number;
  shown: number;
  itemLabel: string;
  href: string;
}) {
  if (total === 0) return null;
  const separator = href.includes("?") ? "&" : "?";

  return (
    <div className="mt-4 flex flex-col gap-3 text-xs sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[var(--text-secondary)]">
        Mostrando <strong className="text-[var(--navy)]">{shown}</strong> de {total} {itemLabel}
      </p>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link href={`${href}${separator}page=${page - 1}`} className="rounded-lg border border-[var(--border)] px-3 py-2 font-bold text-[var(--navy)]">
              Anterior
            </Link>
          ) : null}
          <span className="font-semibold text-[var(--text-secondary)]">Página {page} de {pages}</span>
          {page < pages ? (
            <Link href={`${href}${separator}page=${page + 1}`} className="rounded-lg border border-[var(--border)] px-3 py-2 font-bold text-[var(--navy)]">
              Siguiente
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
