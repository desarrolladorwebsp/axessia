import assert from "node:assert/strict";
import test from "node:test";
import { resolveQuoteRequestOrigin } from "../lib/request-origin";

test("customer portal is always marked as WEB", () => {
  assert.equal(resolveQuoteRequestOrigin({ hasCustomerSession: true, hasInternalActor: true }), "WEB");
});

test("internal creation is marked as EJECUTIVO", () => {
  assert.equal(resolveQuoteRequestOrigin({ hasCustomerSession: false, hasInternalActor: true }), "EJECUTIVO");
});

test("public creation is marked as WEB", () => {
  assert.equal(resolveQuoteRequestOrigin({ hasCustomerSession: false, hasInternalActor: false }), "WEB");
});
