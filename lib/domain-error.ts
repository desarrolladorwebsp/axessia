export class DomainError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}
