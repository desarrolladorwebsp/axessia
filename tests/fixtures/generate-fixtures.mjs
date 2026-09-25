#!/usr/bin/env node
/**
 * Genera archivos binarios reutilizables para tests unitarios y E2E:
 * imagen válida, PDF válido y archivo no permitido.
 * Ejecutar manualmente solo si se necesita regenerar los fixtures:
 *   node tests/fixtures/generate-fixtures.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts } from "pdf-lib";

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "files");

// PNG válido de 1x1 píxel (transparente), firma real de PNG.
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

// JPEG válido de 1x1 píxel, firma real de JPEG (FF D8 FF).
const JPG_1X1 = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMDAwMDAwQEBAQFBQUGBgcHBwcICAgJCQkKCgoLCwsMDAwODg4QEBASEhIUFBQVFRUXFxcZGRkaGhobGxseHh4hISEjIyMlJSUnJycqKiotLS0vLzAyMjI0NDQ2NjY4ODg7Ozs9PT1AQEBCQkJFRUVHR0dKSkpMTExPT09RUVFUVFRWVlZZWVlbW1teXl5gYGBjY2NlZWVoaGhqampsbGxvb29xcXFzc3N2dnZ4eHh6enp9fX2AgICBgYGEhISGhoaJiYmLi4uOjo6QkJCSkpKUlJSWlpaZmZmbm5udnZ2gn6CioqKlpaWnp6eqqqqsrKyurq6xsbGzs7O2tra4uLi6urq9vb2/v7/BwcHDw8PGxsbIyMjKysrNzc3Pz8/S0tLU1NTW1tbZ2dnb29vd3d3g4ODi4uLl5eXn5+fp6enr6+vu7u7w8PDy8vL09PT29vb5+fn7+/v+/v7///8AAP/bAEMBAwMDAwMDBAQEBQUFBgYHBwcICAgJCQkKCgoLCwsMDAwODg4QEBASEhIUFBQVFRUXFxcZGRkaGhobGxseHh4hISEjIyMlJSUnJycqKiotLS0vLzAyMjI0NDQ2NjY4ODg7Ozs9PT1AQEBCQkJFRUVHR0dKSkpMTExPT09RUVFUVFRWVlZZWVlbW1teXl5gYGBjY2NlZWVoaGhqampsbGxvb29xcXFzc3N2dnZ4eHh6enp9fX2AgICBgYGEhISGhoaJiYmLi4uOjo6QkJCSkpKUlJSWlpaZmZmbm5udnZ2gn6CioqKlpaWnp6eqqqqsrKyurq6xsbGzs7O2tra4uLi6urq9vb2/v7/BwcHDw8PGxsbIyMjKysrNzc3Pz8/S0tLU1NTW1tbZ2dnb29vd3d3g4ODi4uLl5eXn5+fp6enr6+vu7u7w8PDy8vL09PT29vb5+fn7+/v+/v7//9sAQwBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFD/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwCz/9k=",
  "base64",
);

async function buildPdf() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([200, 120]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  page.drawText("AXESSIA - Documento de prueba QA", { x: 10, y: 60, size: 10, font });
  return pdfDoc.save();
}

async function main() {
  await mkdir(outDir, { recursive: true });

  await writeFile(path.join(outDir, "sample-image.png"), PNG_1X1);
  await writeFile(path.join(outDir, "sample-image.jpg"), JPG_1X1);
  await writeFile(path.join(outDir, "sample-document.pdf"), Buffer.from(await buildPdf()));
  await writeFile(
    path.join(outDir, "unauthorized-file.txt"),
    "Este archivo de texto plano no debe ser aceptado por el sistema de subida de documentos de AXESSIA.\n",
  );

  console.log(`Fixtures generados en ${outDir}`);
}

main().catch((error) => {
  console.error("No fue posible generar los fixtures:", error);
  process.exitCode = 1;
});
