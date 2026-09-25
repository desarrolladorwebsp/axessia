import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import { validateUploadFile } from "../../lib/storage/validation";

const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "files");

async function readFixture(fileName: string): Promise<Buffer> {
  return readFile(path.join(FIXTURES_DIR, fileName));
}

describe("subida de documentos: imágenes permitidas", () => {
  it("acepta una imagen PNG válida", async () => {
    const buffer = await readFixture("sample-image.png");
    const result = validateUploadFile({ buffer, mimeType: "image/png", extension: "png", size: buffer.length });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.mimeType, "image/png");
      assert.equal(result.extension, "png");
    }
  });

  it("acepta una imagen JPG válida", async () => {
    const buffer = await readFixture("sample-image.jpg");
    const result = validateUploadFile({ buffer, mimeType: "image/jpeg", extension: "jpg", size: buffer.length });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.mimeType, "image/jpeg");
  });
});

describe("subida de documentos: PDF permitido", () => {
  it("acepta un PDF válido", async () => {
    const buffer = await readFixture("sample-document.pdf");
    const result = validateUploadFile({ buffer, mimeType: "application/pdf", extension: "pdf", size: buffer.length });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.mimeType, "application/pdf");
      assert.equal(result.extension, "pdf");
    }
  });
});

describe("subida de documentos: archivos rechazados", () => {
  it("rechaza un archivo de texto plano no permitido", async () => {
    const buffer = await readFixture("unauthorized-file.txt");
    const result = validateUploadFile({ buffer, mimeType: "text/plain", extension: "txt", size: buffer.length });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /Extensión no permitida/);
  });

  it("rechaza un archivo vacío", () => {
    const result = validateUploadFile({ buffer: Buffer.alloc(0), mimeType: "image/png", extension: "png", size: 0 });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /vacío/);
  });

  it("rechaza un archivo que supera el tamaño máximo permitido", async () => {
    const buffer = await readFixture("sample-image.png");
    const result = validateUploadFile({ buffer, mimeType: "image/png", extension: "png", size: 999_999_999 });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /máximo permitido/);
  });

  it("rechaza un archivo con extensión .pdf pero contenido de imagen (contenido no coincide con extensión)", async () => {
    const buffer = await readFixture("sample-image.png");
    const result = validateUploadFile({ buffer, mimeType: "application/pdf", extension: "pdf", size: buffer.length });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /no coincide/);
  });

  it("rechaza un archivo cuyo contenido no coincide con ninguna firma conocida", () => {
    const buffer = Buffer.from("no-soy-un-archivo-valido");
    const result = validateUploadFile({ buffer, mimeType: "application/octet-stream", extension: "png", size: buffer.length });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /no reconocido/);
  });

  it("rechaza extensiones ejecutables o de script aunque el nombre las declare como imagen", async () => {
    const buffer = await readFixture("sample-image.png");
    const result = validateUploadFile({ buffer, mimeType: "application/x-msdownload", extension: "exe", size: buffer.length });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /Extensión no permitida/);
  });
});
