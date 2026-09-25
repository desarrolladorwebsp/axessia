/**
 * Generadores de datos de prueba aislados para E2E. Nunca usar correos,
 * RUT o teléfonos reales: todo se genera con un sufijo único por ejecución
 * para poder identificar y limpiar los datos de prueba fácilmente.
 */

const RUN_ID = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

/** Calcula el dígito verificador de un RUT chileno (algoritmo módulo 11). */
function computeRutVerifier(digits: string): string {
  let sum = 0;
  let multiplier = 2;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    sum += Number(digits[index]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return "0";
  if (remainder === 10) return "K";
  return String(remainder);
}

/** Genera un RUT chileno válido y determinístico a partir de una semilla numérica. */
export function generateValidTestRut(seed: number): string {
  const digits = String(10_000_000 + (seed % 8_000_000));
  return `${digits}-${computeRutVerifier(digits)}`;
}

export function uniqueTestEmail(prefix: string): string {
  return `qa.${prefix}.${RUN_ID}.${Math.floor(Math.random() * 100000)}@axessia-qa.test`;
}

/** Cumple la política de contraseña de AXESSIA: 8+ caracteres, mayúscula, minúscula y número. */
export const TEST_PASSWORD = "AxessiaQA1234";

export function testCustomerName(prefix: string): string {
  return `QA ${prefix} ${RUN_ID}`;
}

export const E2E_TAG = `[e2e-${RUN_ID}]`;
