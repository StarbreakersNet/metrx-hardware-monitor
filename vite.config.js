import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vueDevTools from "vite-plugin-vue-devtools";

// Variables fournies par la CLI Tauri (`tauri dev` / `tauri build`)
const host = process.env.TAURI_DEV_HOST;
const isDebug = !!process.env.TAURI_ENV_DEBUG;

export default defineConfig({
  plugins: [vue(), vueDevTools(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // Laisse les erreurs Rust visibles dans le terminal de `tauri dev`
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 5174 } : undefined,
    watch: {
      ignored: ["**/src-tauri/**", "**/src-sidecar/**"],
    },
  },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: {
    // WebView2 (Chromium) sous Windows, WebKit sous macOS (13+, imposé par Bun) et Linux
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari16",
    minify: !isDebug,
    sourcemap: isDebug,
    // Naive UI et les icônes Tabler sont importés en entier (~4,5 Mo, chargés en local)
    chunkSizeWarningLimit: 5000,
  },
});
