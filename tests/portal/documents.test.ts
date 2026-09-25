import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { isPortalDocumentCategory } from "../../lib/portal/document-categories";
import { resourceBelongsToCustomer } from "../../lib/portal/scope";

describe("documentos del portal", () => {
  it("solo admite categorías gestionadas y mandato generado", () => {
    assert.equal(isPortalDocumentCategory("prescriptions"), true);
    assert.equal(isPortalDocumentCategory("client-documents"), true);
    assert.equal(isPortalDocumentCategory("mandate-documents"), true);
    assert.equal(isPortalDocumentCategory("generated-mandate"), true);
    assert.equal(isPortalDocumentCategory("files"), false);
    assert.equal(isPortalDocumentCategory("../storage"), false);
    assert.equal(isPortalDocumentCategory("prescriptions/../../etc"), false);
  });

  it("niega el documento si la solicitud dueña no es del cliente autenticado", () => {
    assert.equal(resourceBelongsToCustomer("customer-b", "customer-a"), false);
  });
});
