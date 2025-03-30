import nodeAvailable from "@renderer/models/nodeAvailable";
import _ from "lodash";
import { defineStore } from "pinia";
import { computed, reactive, ref, watch } from "vue";

const electronStore = {
  startOnLogin: await window.electron.store.get("startOnLogin"),
  startMinimized: await window.electron.store.get("startMinimized"),
};
const observerElectronStoreRegistered = ref(false);

const DEFAULT_USER_SETTINGS = {
  theme: "system",
  autoUpdate: false,
  updateChanel: await getDefaultUpdateChanel(),
  nodeFrequency: 1000,
  graphColumns: 2,
  showSideMenu: false,
  sideMenuCollapsed: true,
  showChartTitle: true,
  showXLabel: false,
  chartsDefault: {
    warningThreshold: 75,
    dangerThreshold: 90,
    showGraph: true,
    showAverage: true,
    showMinMax: true,
    showThresholds: false,
  },
  charts: [],
};
const DEFAULT_NODE_SELECTED = [
  "mem.*",
  "graphics.*",
  "cpuCurrentSpeed.*",
  "cpuTemperature.*",
  "currentLoad.currentLoad, currentLoadIdle",
  "time.current",
  "time.uptime",
  "time.timezone",
  "time.timezoneName",
];

async function getDefaultUpdateChanel() {
  const version = await window.electron.app.getVersion();
  const subVersion = version.split("-")[1];
  let chanel = "latest";

  if (subVersion) {
    chanel = subVersion;
  }

  return chanel;
}

export const useUserStore = defineStore(
  "user",
  () => {
    const electron = reactive({
      startOnLogin: electronStore.startOnLogin,
      startMinimized: electronStore.startMinimized,
    });
    const settings = reactive({
      ...DEFAULT_USER_SETTINGS,
    });
    const nodeSelected = ref([...DEFAULT_NODE_SELECTED]);

    const isEnvDev = computed(() => {
      return window.electron.process.env.NODE_ENV === "development";
    });

    function useNode(node) {
      nodeSelected.value.push(getNodeString(node));
    }

    function unuseNode(node) {
      nodeSelected.value = _.filter(nodeSelected.value, value => getNodeString(node) !== value);
    }

    function getNodeString(node) {
      return node?.apiKey + "." + node?.params.join(", ");
    }

    // Watch for replicate changes to electron store
    for (const key in electron) {
      watch(
        () => electron[key],
        () => {
          window.electron.store.set(key, electron[key]);
        }
      );
    }

    // Observer for electron store changes
    if (!observerElectronStoreRegistered.value) {
      window.electron.ipcRenderer.on("electron-store-startOnLogin", (event, data) => {
        electron.startOnLogin = data;
      });
      window.electron.ipcRenderer.on("electron-store-startMinimized", (event, data) => {
        electron.startMinimized = data;
      });
      observerElectronStoreRegistered.value = true;
    }

    function resetAllSettings() {
      Object.assign(settings, DEFAULT_USER_SETTINGS);
      nodeSelected.value = DEFAULT_NODE_SELECTED;
    }

    return {
      nodeAvailable,
      nodeSelected,
      useNode,
      unuseNode,
      getNodeString,
      electron,
      settings,
      isEnvDev,
      resetAllSettings,
      getDefaultUpdateChanel,
    };
  },
  {
    persist: {
      paths: ["settings", "nodeSelected"],
    },
  }
);
