// ESLint flat config — PriMo Nails storefront (Vite + React 19 + TS, browser).
//
// Pragmatic "adopt-without-boiling-the-ocean" baseline: ERRORS only for genuine
// bugs (chiefly react-hooks rules-of-hooks), WARNINGS for everything else so the
// gate lands clean (0 errors) today. Warnings are tracked, not blocking.
// No type-aware rules (no parserOptions.project) — keep it fast.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default tseslint.config(
  {
    // Generated / build output — never lint.
    ignores: ["dist/", "node_modules/", "coverage/", "*.config.js", "*.config.ts"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // react-hooks: rules-of-hooks is a real-bug rule → keep ERROR.
      "react-hooks/rules-of-hooks": "error",
      // exhaustive-deps is noisy / stylistic → warn.
      "react-hooks/exhaustive-deps": "warn",
      // Fast-refresh hygiene → warn (many files export helpers alongside components).
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // Intentional `as any` / @ts-nocheck spots exist → warn, don't block.
      "@typescript-eslint/no-explicit-any": "warn",
      // Unused vars → warn, allow underscore-prefixed intentional discards.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "no-console": "warn",
    },
  },
  // Node-context files (build scripts).
  {
    files: ["scripts/**/*.{js,mjs,ts}", "*.config.{js,ts,mjs}"],
    languageOptions: { globals: { ...globals.node } },
    rules: { "no-console": "off" },
  },
);
