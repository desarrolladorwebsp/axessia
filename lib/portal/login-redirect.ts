const PORTAL_PREFIX = "/mi-cuenta";

export function safePortalNextPath(value: string | null | undefined): string | null {
  if (!value) return null;

  const next = value.trim();
  if (!next.startsWith(PORTAL_PREFIX)) return null;
  if (next.startsWith("//") || next.includes("://") || next.includes("\\")) return null;
  if (/%5c/i.test(next) || next.includes("@")) return null;

  return next;
}

export function portalLoginPath(nextPath?: string | null) {
  const next = safePortalNextPath(nextPath);
  if (!next) return "/ingresar";
  return `/ingresar?next=${encodeURIComponent(next)}`;
}
