import { useUserStore } from "@renderer/stores/user";
import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

export const useSystemStore = defineStore("system", () => {
  const user = useUserStore();
  const info = ref({});
  const metrics = ref({});
  const interval = computed(() => user.settings.nodeFrequency ?? 1000);
  const observer = ref({});

  const nodeUsed = computed(() => {
    let obj = {};

    if (user.nodeSelected) {
      user.nodeSelected.forEach(node => {
        let extractedApiKey = node.split(".")[0];
        let params = node.split(".")[1].split(",");

        if (obj[extractedApiKey]) {
          let paramsAlreadyExtracted = obj[extractedApiKey].split(", ");

          obj[extractedApiKey] = [...paramsAlreadyExtracted, ...params].join(", ");
        } else {
          obj[extractedApiKey] = node.split(".")[1];
        }
      });
    }

    return obj;
  });

  async function initStaticMetrics() {
    let initialObj = {};
    initialObj.app = {
      name: window.electron.process.env.npm_package_name,
      version: window.electron.process.env.npm_package_version,
    };
    initialObj.versions = window.electron.process.versions;
    info.value = initialObj;
    await getAsyncStaticMetrics(info.value);
  }

  async function getAsyncStaticMetrics(obj) {
    Object.assign(obj, await window.api.getStaticData());
  }

  function storeCallback(apiData) {
    metrics.value = apiData;
  }

  watch(
    [interval, nodeUsed],
    () => {
      clearInterval(observer.value);
      observer.value = window.api.observe(nodeUsed.value, interval.value, storeCallback);
    },
    { immediate: true }
  );

  return {
    interval,
    info,
    metrics,
    initStaticMetrics,
    nodeUsed,
  };
});
