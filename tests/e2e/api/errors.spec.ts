import { expect, test } from "@playwright/test";

test.describe("Manejo de errores de API", () => {
  test("una API interna protegida responde 401 sin sesión", async ({ request }) => {
    const response = await request.get("/api/quote-requests");
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  test("una API de portal protegida responde 401 sin sesión de cliente", async ({ request }) => {
    const response = await request.get("/api/portal/summary");
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  test("login con credenciales inexistentes responde 401 con mensaje claro", async ({ request }) => {
    const response = await request.post("/api/auth/login", {
      data: { email: "usuario-que-no-existe@axessia-qa.test", password: "ClaveInventada123" },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  test("login con cuerpo malformado responde con un error controlado (JSON, no un crash sin manejar)", async ({ request }) => {
    const response = await request.post("/api/auth/login", {
      headers: { "Content-Type": "application/json" },
      data: "no-es-json-valido",
    });
    // Nota de calidad: hoy responde 500 porque el JSON.parse falla dentro del
    // try/catch genérico de la ruta. Sería preferible un 400, pero se deja
    // documentado en vez de modificar la lógica de negocio sin que se solicite.
    expect([400, 500]).toContain(response.status());
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });
});
