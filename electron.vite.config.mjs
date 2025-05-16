import vue from "@vitejs/plugin-vue";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { resolve } from "path";
import vueDevTools from "vite-plugin-vue-devtools";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve("src/main/index.js"),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    server: {
      host: "127.0.0.1",
    },
    define: {
      "process.env": {},
    },
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
      },
    },
    loaders: {
      sass: 'vue-style-loader!css-loader!sass-loader?indentedSyntax=1&data=@import "./src/renderer/globals"',
      scss: 'vue-style-loader!css-loader!sass-loader?data=@import "./src/renderer/globals";',
    },
    plugins: [vue(), vueDevTools()],
    css: {
      postcss: "src/renderer/postcss.config.js",
    },
  },
});
