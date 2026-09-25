import { describe, expect, it } from "vitest";

import {
  buildQuoteNumberVariants,
  isQuoteTrackingIdentifier,
  normalizeTrackingIdentifier,
} from "@/lib/tracking-normalization";

describe("identificadores de cotización para seguimiento", () => {
  it.each(["C-10001", "c10001", " C-10001 "])("reconoce %s como cotización", (value) => {
    expect(isQuoteTrackingIdentifier(value)).toBe(true);
  });

  it.each(["S-100001", "100001", "cotizacion"])("no confunde %s con una cotización", (value) => {
    expect(isQuoteTrackingIdentifier(value)).toBe(false);
  });

  it("genera variantes compatibles con el número almacenado", () => {
    expect(buildQuoteNumberVariants("c10001")).toContain("C-10001");
    expect(buildQuoteNumberVariants("C-10001")).toContain("C10001");
  });

  it("mantiene una normalización estable para búsquedas", () => {
    expect(normalizeTrackingIdentifier(" C-10.001 ")).toBe("c10001");
  });
});
