import { DomainError } from "@/lib/domain-error";

export function scopedToCustomer(customerId: string) {
  if (!customerId) {
    throw new DomainError("No autorizado.", 401);
  }
  return { customerId };
}

export function ownedResourceWhere(customerId: string, id: string) {
  if (!id) {
    throw new DomainError("Recurso no encontrado.", 404);
  }
  return { id, customerId };
}

export function resourceBelongsToCustomer(resourceCustomerId: string | null | undefined, customerId: string) {
  return Boolean(resourceCustomerId) && resourceCustomerId === customerId;
}
