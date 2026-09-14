import assert from "node:assert/strict";

function parseOptionalPositiveInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  const quantity = Number.isFinite(parsed) ? Math.trunc(parsed) : NaN;
  if (!Number.isInteger(quantity) || quantity <= 0) return "invalid";
  return quantity;
}

assert.equal(parseOptionalPositiveInt(""), null);
assert.equal(parseOptionalPositiveInt(undefined), null);
assert.equal(parseOptionalPositiveInt(null), null);
assert.equal(parseOptionalPositiveInt(30), 30);
assert.equal(parseOptionalPositiveInt("12"), 12);
assert.equal(parseOptionalPositiveInt("0"), "invalid");
assert.equal(parseOptionalPositiveInt(-1), "invalid");
assert.equal(parseOptionalPositiveInt("abc"), "invalid");

console.log("optional tablet quantity parser: ok");
