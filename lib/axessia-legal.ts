export type AxessiaLegalDetails = {
  legalName: string;
  legalRut: string;
};

export function getAxessiaLegalDetails(): AxessiaLegalDetails | null {
  const legalName = process.env.AXESSIA_LEGAL_NAME?.trim();
  const legalRut = process.env.AXESSIA_LEGAL_RUT?.trim();
  return legalName && legalRut ? { legalName, legalRut } : null;
}