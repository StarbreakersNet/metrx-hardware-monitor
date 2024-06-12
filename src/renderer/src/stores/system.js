import { useUserStore } from "@renderer/stores/user";
import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

export const useSystemStore = defineStore("system", () => {
  const user = useUserStore();
  const app = ref({});
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

  async function init() {
    app.value = {
      name: await window.electron.app.getName(),
      version: await window.electron.app.getVersion(),
    };

    info.value = await window.api.getStaticData();
    Object.assign(info.value.versions, window.electron.process.versions);
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
    app,
    info,
    metrics,
    init,
    nodeUsed,
  };
});
