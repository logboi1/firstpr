import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  { files: ["supabase/functions/**/*.ts"], languageOptions: { globals: { Deno: "readonly" } } },
  globalIgnores([".next/**", "out/**", "next-env.d.ts"]),
]);
