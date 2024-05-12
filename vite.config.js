import { defineConfig } from "vite";
import { resolve } from "path";

// Config à répliquer depuis electron.vite.config.js pour que le linter de Fleet comprenne les alias
export default defineConfig({
  loader: {
    sass: 'vue-style-loader!css-loader!sass-loader?indentedSyntax=1&data=@import "./src/renderer/globals"',
    scss: 'vue-style-loader!css-loader!sass-loader?data=@import "./src/renderer/globals";',
  },
  resolve: {
    alias: {
      "@renderer": resolve("src/renderer/src"),
    },
  },
});
