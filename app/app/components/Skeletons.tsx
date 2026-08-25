"use client";

// Skeleton de tabla con filas
export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="grid grid-cols-6 gap-4 px-6 py-4 bg-[var(--background)] rounded-lg">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-4 bg-gray-200 rounded animate-pulse"
          />
        ))}
      </div>
      
      {/* Rows */}
      {[...Array(rows)].map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-6 gap-4 px-6 py-4 bg-white rounded-lg border border-[var(--border)] animate-pulse"
        >
          {[...Array(6)].map((_, j) => (
            <div
              key={j}
              className="h-4 bg-gray-200 rounded"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Skeleton de cards (dashboard)
export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl p-6 border border-[var(--border)] animate-pulse"
        >
          <div className="h-6 bg-gray-200 rounded w-2/3 mb-4" />
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </div>
      ))}
    </div>
  );
}

// Skeleton de contenido (texto)
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(lines)].map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-200 rounded animate-pulse"
          style={{
            width: i === lines - 1 ? "60%" : "100%",
          }}
        />
      ))}
    </div>
  );
}

// Skeleton de lista
export function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(items)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 bg-white rounded-lg border border-[var(--border)] animate-pulse"
        >
          <div className="w-12 h-12 bg-gray-200 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Skeleton genérico rectangular
export function SkeletonBox({
  width = "100%",
  height = "20px",
}: {
  width?: string;
  height?: string;
}) {
  return (
    <div
      className="bg-gray-200 rounded animate-pulse"
      style={{ width, height }}
    />
  );
}
