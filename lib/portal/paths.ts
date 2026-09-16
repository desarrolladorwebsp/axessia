export const PORTAL_HOME_PATH = "/mi-cuenta";
export const PORTAL_PROFILE_PATH = "/mi-cuenta/perfil";

export function portalHomePath(page?: string | null) {
  if (!page) return PORTAL_HOME_PATH;
  const parsed = Number.parseInt(page, 10);
  if (!Number.isInteger(parsed) || parsed <= 1) return PORTAL_HOME_PATH;
  return `${PORTAL_HOME_PATH}?page=${parsed}`;
}

export function portalRequestDetailPath(requestId: string, payment?: string | null) {
  const path = `/mi-cuenta/solicitudes/${encodeURIComponent(requestId)}`;
  return payment === "return" ? `${path}?payment=return` : path;
}
