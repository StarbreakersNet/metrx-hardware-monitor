// Configuration ESLint (case 12) : migration de .eslintrc.cjs vers le format plat, rendu
// obligatoire par ESLint 10 (installe par la devDep ^10.1.0 sans que la config suive — le
// `npm run lint` du projet echouait depuis). Meme intention que l'ancienne config :
// eslint:recommended + vue3-recommended + prettier (sans imposer son formatage en erreurs),
// et les deux regles vue eteinees. .eslintignore est remplace par globalIgnores.
import js from "@eslint/js";
import globals from "globals";
import pluginVue from "eslint-plugin-vue";
import configPrettier from "@vue/eslint-config-prettier/skip-formatting";
import { globalIgnores } from "eslint/config";

export default [
  globalIgnores(["node_modules/**", "dist/**", "out/**"]),
  ...pluginVue.configs["flat/recommended"],
  {
    files: ["**/*.{js,mjs,cjs,vue}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node, ...globals.es2021 },
    },
    rules: {
      ...js.configs.recommended.rules,
      "vue/require-default-prop": "off",
      "vue/multi-word-component-names": "off",
      // Consigne durable 3 (« il faut respecter l'existant ») : le code amont n'a jamais ete
      // linte (ESLint 10 sans config plate le faisait echouer avant meme le depot). Plutot que
      // retoucher le core pour obeir aux regles, les regles s'adaptent : les liaisons de catch
      // « jamais lues » sont legitimes (comportement historique de no-unused-vars) et les
      // variables mortes heritees restent des AVERTISSEMENTS visibles, pas des erreurs bloquantes.
      "no-unused-vars": ["warn", { caughtErrors: "none" }],
      // Le style amont est `#default` ; ne pas imposer `v-slot` (sinon --fix reecrirait App.vue).
      "vue/v-slot-style": "off",
    },
  },
  {
    // Les fichiers .cjs (scripts node) ne sont pas des modules de bundle : require() et
    // module.exports sont la norme. Les tests, eux, restent des modules (harnais.mjs).
    files: ["**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
  },
  configPrettier,
];
