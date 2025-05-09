import "@renderer/assets/css/styles.sass";
import About from "@renderer/views/About.vue";
import Home from "@renderer/views/Home.vue";
import NodesList from "@renderer/views/NodesList.vue";
import ProbesSettings from "@renderer/views/ProbesSettings.vue";
import Settings from "@renderer/views/Settings.vue";
import naive from "naive-ui";
import { createPinia } from "pinia";
import { createPersistedState } from "pinia-plugin-persistedstate";
import { createApp } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";
import App from "./App.vue";

const pinia = createPinia();
const app = createApp(App);
const routes = [
  { path: "/", name: "home", component: Home },
  { path: "/nodes", name: "nodes", component: NodesList },
  { path: "/probes", name: "probes", component: ProbesSettings },
  { path: "/settings", name: "settings", component: Settings },
  { path: "/about", name: "about", component: About },
];
const router = createRouter({
  // 4. Provide the history implementation to use. We
  // are using the hash history for simplicity here.
  history: createWebHashHistory(),
  routes, // short for `routes: routes`
});

pinia.use(
  createPersistedState({
    storage: localStorage,
  })
);

app.use(pinia);
app.use(naive);
app.use(router);
app.mount("#app");
