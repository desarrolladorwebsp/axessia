/**
 * Server-side base URL for links in emails and auth flows.
 * Prefers APP_URL as required for password-reset links.
 */
export function getAppBaseUrl(): string {
  const configured =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    process.env.NEXT_PUBLIC_VERCEL_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  if (!configured) {
    return "http://localhost:3000";
  }

  const urlWithProtocol = /^https?:\/\//i.test(configured) ? configured : `https://${configured}`;
  return urlWithProtocol.replace(/\/$/, "");
}
