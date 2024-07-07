import nodeAvailable from "@renderer/models/nodeAvailable";
import _ from "lodash";
import { defineStore } from "pinia";
import { computed, reactive, ref, watch } from "vue";

const electronStore = {
  startOnLogin: await window.electron.store.get("startOnLogin"),
  startMinimized: await window.electron.store.get("startMinimized"),
};
const observerElectronStoreRegistered = ref(false);

export const useUserStore = defineStore(
  "user",
  () => {
    const electron = reactive({
      startOnLogin: electronStore.startOnLogin,
      startMinimized: electronStore.startMinimized,
    });
    const settings = reactive({
      theme: "dark",
      autoUpdate: false,
      nodeFrequency: 1000,
      graphColumns: 2,
      showSideMenu: false,
      sideMenuCollapsed: true,
      showChartTitle: true,
      showXLabel: false,
      chartsDefault: {
        warningThreshold: 75,
        dangerThreshold: 90,
        showThresholds: false,
      },
      charts: [],
    });
    const nodeSelected = ref([
      "mem.*",
      "graphics.*",
      "cpuCurrentSpeed.*",
      "cpuTemperature.*",
      "currentLoad.currentLoad, currentLoadIdle",
      "time.current",
      "time.uptime",
      "time.timezone",
      "time.timezoneName",
    ]);

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

    return {
      nodeAvailable,
      nodeSelected,
      useNode,
      unuseNode,
      getNodeString,
      electron,
      settings,
      isEnvDev,
    };
  },
  {
    persist: {
      paths: ["settings", "nodeSelected"],
    },
  }
);
