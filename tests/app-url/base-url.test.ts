import assert from "node:assert/strict";
import { afterEach, describe, it } from "vitest";

import { getAppBaseUrl } from "../../lib/app-url";

const ENV_KEYS = [
  "APP_URL",
  "NEXT_PUBLIC_APP_URL",
  "VERCEL_URL",
  "NEXT_PUBLIC_VERCEL_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_ENV",
] as const;

const original = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));

function setEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  for (const key of ENV_KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(values)) process.env[key] = value;
}

afterEach(() => {
  for (const [key, value] of original) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("URL base de la aplicación", () => {
  it("respeta APP_URL por sobre cualquier otra variable", () => {
    setEnv({ APP_URL: "https://axessia.cl", VERCEL_URL: "axessia-abc123.vercel.app" });
    assert.equal(getAppBaseUrl(), "https://axessia.cl");
  });

  it("usa NEXT_PUBLIC_APP_URL cuando APP_URL no está definida", () => {
    setEnv({ NEXT_PUBLIC_APP_URL: "https://axessia.cl" });
    assert.equal(getAppBaseUrl(), "https://axessia.cl");
  });

  it("ignora VERCEL_URL porque apunta al despliegue, no al dominio de producción", () => {
    // Vercel define VERCEL_URL en cada despliegue con un host *.vercel.app que
    // cambia en cada build; usarlo rompe los enlaces y las cookies de sesión.
    setEnv({ VERCEL_ENV: "production", VERCEL_URL: "axessia-abc123.vercel.app" });
    assert.equal(getAppBaseUrl(), "https://axessia.cl");
  });

  it("usa el dominio de producción del proyecto cuando está disponible", () => {
    setEnv({
      VERCEL_ENV: "production",
      VERCEL_URL: "axessia-abc123.vercel.app",
      VERCEL_PROJECT_PRODUCTION_URL: "axessia.cl",
    });
    assert.equal(getAppBaseUrl(), "https://axessia.cl");
  });

  it("cae a axessia.cl en producción cuando no hay configuración", () => {
    setEnv({ VERCEL_ENV: "production" });
    assert.equal(getAppBaseUrl(), "https://axessia.cl");
  });

  it("mantiene localhost en desarrollo local", () => {
    setEnv({});
    assert.equal(getAppBaseUrl(), "http://localhost:3000");
  });

  it("agrega protocolo y quita la barra final", () => {
    setEnv({ APP_URL: "axessia.cl/" });
    assert.equal(getAppBaseUrl(), "https://axessia.cl");
  });
});
