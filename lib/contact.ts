export const CONTACT_MOTIVES = [
  "Información",
  "Reclamo",
  "Solicitud especial",
  "Felicitaciones",
  "Otras",
] as const;

export type ContactMotive = (typeof CONTACT_MOTIVES)[number];

export function isContactMotive(value: string): value is ContactMotive {
  return (CONTACT_MOTIVES as readonly string[]).includes(value);
}
