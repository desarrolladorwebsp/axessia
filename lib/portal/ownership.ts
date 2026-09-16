import { DomainError } from "@/lib/domain-error";

export function assertSameOwner(resourceOwnerId: string | null | undefined, customerId: string) {
  if (!resourceOwnerId || resourceOwnerId !== customerId) {
    throw new DomainError("Recurso no encontrado.", 404);
  }
}

export function ownedByCustomer<T extends { customerId?: string | null }>(resource: T | null, customerId: string): T {
  if (!resource || resource.customerId !== customerId) {
    throw new DomainError("Recurso no encontrado.", 404);
  }
  return resource;
}
