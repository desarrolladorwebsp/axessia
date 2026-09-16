import { DomainError } from "@/lib/domain-error";
import { normalizeCustomerName } from "@/lib/customer-validation";

export const PORTAL_EDITABLE_PROFILE_FIELDS = ["name", "phone", "city", "promotionsConsent"] as const;

export type PortalEditableProfileField = (typeof PORTAL_EDITABLE_PROFILE_FIELDS)[number];

export type PortalProfileUpdateInput = {
  name?: unknown;
  phone?: unknown;
  city?: unknown;
  promotionsConsent?: unknown;
  email?: unknown;
  rut?: unknown;
  password?: unknown;
  passwordHash?: unknown;
  id?: unknown;
  hasPendingRequest?: unknown;
};

export type PortalProfileUpdate = {
  name: string;
  phone: string;
  city: string;
  promotionsConsent: boolean;
};

const BLOCKED_PROFILE_FIELDS = ["email", "rut", "password", "passwordHash", "id", "hasPendingRequest"] as const;

export function hasBlockedProfileField(input: PortalProfileUpdateInput) {
  return BLOCKED_PROFILE_FIELDS.some((field) => field in input && input[field] !== undefined);
}

function readRequiredText(value: unknown, field: string, maxLength: number) {
  if (typeof value !== "string") {
    throw new DomainError(`El campo ${field} es obligatorio.`, 400);
  }
  const normalized = field === "name" ? normalizeCustomerName(value) : value.trim().replace(/\s+/g, " ");
  if (!normalized) {
    throw new DomainError(`El campo ${field} es obligatorio.`, 400);
  }
  if (normalized.length > maxLength) {
    throw new DomainError(`El campo ${field} excede el largo permitido.`, 400);
  }
  return normalized;
}

export function parsePortalProfileUpdate(input: PortalProfileUpdateInput): PortalProfileUpdate {
  if (hasBlockedProfileField(input)) {
    throw new DomainError("No es posible modificar el correo, RUT u otros datos de identidad desde el portal.", 400);
  }

  const name = readRequiredText(input.name, "nombre", 120);
  const phone = readRequiredText(input.phone, "teléfono", 30);
  const city = readRequiredText(input.city, "ciudad", 80);

  if (phone.length < 8) {
    throw new DomainError("Ingresa un teléfono válido.", 400);
  }

  if (typeof input.promotionsConsent !== "boolean") {
    throw new DomainError("Indica si deseas recibir información de AXESSIA.", 400);
  }

  return {
    name,
    phone,
    city,
    promotionsConsent: input.promotionsConsent,
  };
}

export function profileUpdateChanged(
  current: { name: string; phone: string; city: string; promotionsConsent: boolean },
  next: PortalProfileUpdate,
) {
  return current.name !== next.name
    || current.phone !== next.phone
    || current.city !== next.city
    || current.promotionsConsent !== next.promotionsConsent;
}
