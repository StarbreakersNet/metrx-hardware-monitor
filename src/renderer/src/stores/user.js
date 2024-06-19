import nodeAvailable from "@renderer/models/nodeAvailable";
import _ from "lodash";
import { darkTheme } from "naive-ui";
import { defineStore } from "pinia";
import { computed, reactive, ref } from "vue";

export const useUserStore = defineStore(
  "user",
  () => {
    const settings = reactive({
      theme: darkTheme,
      isDark: true,
      autoUpdate: false,
      nodeFrequency: 1000,
      graphColumns: 2,
      showSideMenu: false,
      showChartTitle: true,
      showXLabel: false,
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

    return {
      nodeAvailable,
      nodeSelected,
      useNode,
      unuseNode,
      getNodeString,
      settings,
      isEnvDev,
    };
  },
  { persist: true }
);
