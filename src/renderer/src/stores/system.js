import { useUserStore } from "@renderer/stores/user";
import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import staticData from "@renderer/models/staticData";

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
    if (window.electron.process.platform === "win32") {
      window.api.powerShellStart();
    }

    app.value = {
      name: await window.electron.app.getName(),
      version: await window.electron.app.getVersion(),
    };

    info.value = await getStaticData();
    Object.assign(info.value.versions, window.electron.process.versions);

    watch(
      [interval, nodeUsed],
      () => {
        clearInterval(observer.value);
        observer.value = window.api.observe(nodeUsed.value, interval.value, storeCallback);
      },
      { immediate: true }
    );
  }

  async function getStaticData() {
    return await window.api.get(staticData)
  }

  function storeCallback(apiData) {
    metrics.value = apiData;
  }

  function destroy() {
    if (window.electron.process.platform === "win32") {
      window.api.powerShellRelease();
    }
  }

  return {
    interval,
    app,
    info,
    metrics,
    init,
    destroy,
    nodeUsed,
  };
});
