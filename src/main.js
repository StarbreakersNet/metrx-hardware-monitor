import { loadAppInfo } from "@/api/app";
import { getDesktopSettings, loadDesktopSettings } from "@/api/desktop";
import { installShortcuts } from "@/api/shortcuts";
import "@/assets/css/tailwind.css";
import { i18n, setLocale } from "@/i18n";
import "@/assets/css/styles.sass";
import About from "@/views/About.vue";
import Home from "@/views/Home.vue";
import NodesList from "@/views/NodesList.vue";
import ProbesSettings from "@/views/ProbesSettings.vue";
import Settings from "@/views/Settings.vue";
import naive from "naive-ui";
import { createPinia } from "pinia";
import { createPersistedState } from "pinia-plugin-persistedstate";
import { createApp } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";
import App from "./App.vue";

const routes = [
  { path: "/", name: "home", component: Home },
  { path: "/nodes", name: "nodes", component: NodesList },
  { path: "/probes", name: "probes", component: ProbesSettings },
  { path: "/settings", name: "settings", component: Settings },
  { path: "/about", name: "about", component: About },
];

async function bootstrap() {
  installShortcuts();

  // Données nécessaires aux stores dès leur création (version, réglages système)
  await Promise.all([loadAppInfo(), loadDesktopSettings()]);
  setLocale(getDesktopSettings().language);

  const pinia = createPinia();
  const app = createApp(App);
  const router = createRouter({
    history: createWebHashHistory(),
    routes,
  });

  pinia.use(
    createPersistedState({
      storage: localStorage,
    })
  );

  app.use(pinia);
  app.use(i18n);
  app.use(naive);
  app.use(router);
  app.mount("#app");
}

bootstrap();
