/**
 * URL base canónica para enlaces en correos, PDFs, pagos y flujos de autenticación.
 *
 * Deliberadamente NO se usa VERCEL_URL: Vercel la define en cada despliegue con un
 * host *.vercel.app que cambia en cada build, así que los enlaces quedarían apuntando
 * fuera del dominio de producción y las cookies de sesión de axessia.cl no viajarían.
 */
const PRODUCTION_URL = "https://axessia.cl";
const DEVELOPMENT_URL = "http://localhost:3000";

function normalize(url: string) {
  const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return withProtocol.replace(/\/+$/, "");
}

export function getAppBaseUrl(): string {
  const configured =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  if (configured) return normalize(configured);

  const isLocal = !process.env.VERCEL_ENV && process.env.NODE_ENV !== "production";
  return isLocal ? DEVELOPMENT_URL : PRODUCTION_URL;
}
