import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local virtual envs should never be linted
    ".venv/**",
    // Python plugin SDK virtualenv (contains vendored JS)
    "plugin-sdk/python/.venv/**",
    // Tauri build artifacts
    "src-tauri/target/**",
    // Test coverage reports
    "coverage/**",
    "coverage_html/**",
    "plugin-sdk/python/coverage_html/**",
    // Generated/shared type definitions are linted separately
    "types/**",
  ]),
  {
    rules: {
      // Allow unused variables that start with underscore
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      // Allow inline styles for dynamic values (CSS-in-JS)
      "react/forbid-dom-props": "off",
      // Allow <li> without parent context check (react-markdown handles this)
      "jsx-a11y/html-has-lang": "off",
    },
  },
]);

export default eslintConfig;
