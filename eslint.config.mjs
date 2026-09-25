import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Mantiene la calidad exigida por el skill de desarrollo: sin `any` sin
      // justificación y sin variables/imports muertos, pero sin bloquear el
      // build (quedan como warning, igual que el resto de la config de Next).
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
    // Override default ignores of eslint-config-next.
    globalIgnores([
      // Default ignores of eslint-config-next:
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Artefactos de testing y cobertura, no código fuente.
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "storage/**",
      // Script de servidor Node.js standalone (CommonJS por diseño, no forma
      // parte del código de la app Next.js ni se referencia en ningún script).
      "app.js",
    ]),
]);

export default eslintConfig;
