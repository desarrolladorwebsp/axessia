import { defineConfig, devices } from "@playwright/test";

/**
 * URL configurable del entorno a probar. Por defecto apunta al servidor de
 * desarrollo local; en CI o QA se puede sobreescribir con PLAYWRIGHT_BASE_URL
 * para apuntar a un entorno de pruebas aislado (nunca a producción).
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const isCI = Boolean(process.env.CI);

/**
 * Los specs que escriben datos (registro, solicitudes, aislamiento, acceso
 * admin) solo corren con E2E_ALLOW_MUTATIONS=true (ver tests/helpers/mutation-gate.ts).
 * Cuando se habilitan en local, se exige E2E_DATABASE_URL: el servidor que
 * levanta Playwright usa esa base de datos aislada en vez de la definida en
 * .env.local, para nunca escribir en la base de datos de desarrollo normal.
 * En CI, DATABASE_URL ya apunta directamente a la base de datos de pruebas
 * (ver .github/workflows/ci.yml), por lo que no aplica este chequeo.
 */
const allowMutations = process.env.E2E_ALLOW_MUTATIONS === "true";
const testDatabaseUrl = process.env.E2E_DATABASE_URL;

if (allowMutations && !isCI && !testDatabaseUrl) {
  throw new Error(
    "E2E_ALLOW_MUTATIONS=true requiere E2E_DATABASE_URL apuntando a una base de datos de pruebas aislada " +
      "(nunca la de desarrollo). Define E2E_DATABASE_URL antes de ejecutar npm run test:e2e.",
  );
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // Un solo worker local: el servidor de desarrollo (Turbopack) compila cada
  // ruta la primera vez que se visita, y varios workers en paralelo contra la
  // misma instancia provocan compilaciones simultáneas que exceden el timeout.
  workers: isCI ? 2 : 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  outputDir: "test-results",
  timeout: 45_000,
  expect: {
    timeout: 8_000,
  },
  use: {
    baseURL,
    trace: "on-first-retry",
    // Solo se capturan evidencias cuando una prueba falla, para no acumular
    // artefactos innecesarios en ejecuciones exitosas.
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Si no se indica una URL externa (QA/staging), Playwright levanta el
  // servidor de desarrollo local automáticamente para las pruebas.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 120_000,
        env:
          !isCI && allowMutations && testDatabaseUrl
            ? { ...process.env, DATABASE_URL: testDatabaseUrl }
            : undefined,
      },
});
