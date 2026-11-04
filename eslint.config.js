import js from "@eslint/js";
import eslintConfigPrettier from "@vue/eslint-config-prettier";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";

export default [
  {
    ignores: ["dist/**", "src-tauri/**", "node_modules/**", ".yarn/**"],
  },
  js.configs.recommended,
  ...pluginVue.configs["flat/recommended"],
  eslintConfigPrettier,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "vue/require-default-prop": "off",
      "vue/multi-word-component-names": "off",
    },
  },
  {
    // Scripts exécutés par Node / Bun (configs, sidecar)
    files: ["*.config.js", "src-sidecar/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        Bun: "readonly",
      },
    },
  },
];
