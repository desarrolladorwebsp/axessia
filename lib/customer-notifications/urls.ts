import { getAppBaseUrl } from "@/lib/app-url";

export function portalQuotePath(quoteId: string) {
  return `/mi-cuenta/cotizaciones/${encodeURIComponent(quoteId)}`;
}

export function portalRequestPath(requestId: string) {
  return `/mi-cuenta/solicitudes/${encodeURIComponent(requestId)}`;
}

export function portalQuoteUrl(quoteId: string, baseUrl = getAppBaseUrl()) {
  return `${baseUrl}${portalQuotePath(quoteId)}`;
}

export function portalRequestUrl(requestId: string, baseUrl = getAppBaseUrl()) {
  return `${baseUrl}${portalRequestPath(requestId)}`;
}
