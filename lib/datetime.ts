/**
 * Locale y zona horaria únicas para todo el formateo visible de AXESSIA.
 *
 * Fijar la zona horaria es obligatorio en cualquier texto que se renderice en
 * servidor y cliente: sin ella, Node usa la zona del servidor y el navegador la
 * del visitante, y React reporta un error de hidratación.
 */
export const AXESSIA_LOCALE = "es-CL";
export const AXESSIA_TIME_ZONE = "America/Santiago";

const dateTimeFormatter = new Intl.DateTimeFormat(AXESSIA_LOCALE, {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: AXESSIA_TIME_ZONE,
});

const dateFormatter = new Intl.DateTimeFormat(AXESSIA_LOCALE, {
  dateStyle: "medium",
  timeZone: AXESSIA_TIME_ZONE,
});

function toDate(value: Date | string | number) {
  return value instanceof Date ? value : new Date(value);
}

function isValid(value: Date) {
  return !Number.isNaN(value.getTime());
}

/** Fecha y hora en zona horaria de Chile, idéntica en servidor y cliente. */
export function formatDateTimeCl(value: Date | string | number | null | undefined, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  const date = toDate(value);
  return isValid(date) ? dateTimeFormatter.format(date) : fallback;
}

/** Fecha en zona horaria de Chile, idéntica en servidor y cliente. */
export function formatDateCl(value: Date | string | number | null | undefined, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  const date = toDate(value);
  return isValid(date) ? dateFormatter.format(date) : fallback;
}
