"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

export type PaginationProps = {
  shown: number;
  total: number;
  itemLabel: string;
  page?: number;
  pages?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
};

export default function Pagination({ shown, total, itemLabel, page = 1, pages = 1, pageSize = 10, onPageChange }: PaginationProps) {
  const pageNumbers: (number | "ellipsis")[] = [];
  for (let index = 1; index <= pages; index += 1) {
    if (index === 1 || index === pages || (index >= page - 1 && index <= page + 1)) {
      pageNumbers.push(index);
    } else if (pageNumbers[pageNumbers.length - 1] !== "ellipsis") {
      pageNumbers.push("ellipsis");
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--border)] bg-[var(--background)] px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[var(--text-secondary)]">
        Mostrando <strong className="text-[var(--navy)]">{shown}</strong> de {total} {itemLabel}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange?.(page - 1)}
          disabled={page <= 1}
          className="icon-button-small disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Página anterior"
          title="Página anterior"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        {pageNumbers.map((entry, index) =>
          entry === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="px-1 text-[var(--text-secondary)]">…</span>
          ) : (
            <button
              key={entry}
              type="button"
              onClick={() => onPageChange?.(entry)}
              className={`h-8 min-w-8 rounded-lg px-2 font-bold transition ${
                entry === page
                  ? "border border-[var(--purple)] bg-white text-[var(--purple)]"
                  : "text-[var(--text-secondary)] hover:bg-white"
              }`}
            >
              {entry}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onPageChange?.(page + 1)}
          disabled={page >= pages}
          className="icon-button-small disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Página siguiente"
          title="Página siguiente"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <span className="ml-3 hidden items-center text-[var(--text-secondary)] sm:inline-flex">
          {pageSize} por página <ChevronDown className="ml-1 h-3 w-3" />
        </span>
      </div>
    </div>
  );
}
