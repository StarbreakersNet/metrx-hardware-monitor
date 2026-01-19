import { useUserStore } from "@renderer/stores/user";
import { defineStore } from "pinia";
import { computed, reactive, ref, watch } from "vue";
import staticData from "@renderer/models/staticData";

export const useSystemStore = defineStore("system", () => {
  const user = useUserStore();
  const app = reactive({
    name: "",
    displayName: "",
    version: "",
  });
  const info = ref({});
  const metrics = ref({});
  const interval = computed(() => user.settings.nodeFrequency ?? 1000);

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
    await window.api.init();

    app.name = await window.electron.app.getName();
    app.displayName = await window.electron.app.getDisplayName();
    app.version = await window.electron.app.getVersion();

    info.value = await getStaticData();
    Object.assign(info.value.versions, window.electron.process.versions);

    window.api.onData(storeCallback);

    watch(
      [interval, nodeUsed],
      () => {
        window.api.start(nodeUsed.value, interval.value);
      },
      { immediate: true }
    );
  }

  async function getStaticData() {
    return await window.api.get(staticData);
  }

  function storeCallback(apiData) {
    metrics.value = apiData;
  }

  async function destroy() {
    await window.api.destroy();
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
