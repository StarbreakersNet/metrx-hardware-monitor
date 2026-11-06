import { getAppInfo } from "@/api/app";
import metricsApi from "@/api/metrics";
import staticData from "@/models/staticData";
import { useUserStore } from "@/stores/user";
import { defineStore } from "pinia";
import { computed, reactive, ref, watch } from "vue";

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
    await metricsApi.init();

    const appInfo = getAppInfo();

    app.name = appInfo.name;
    app.displayName = appInfo.name;
    app.version = appInfo.version;

    info.value = await getStaticData();
    info.value.versions = {
      tauri: appInfo.tauriVersion,
      webview: appInfo.webviewVersion,
      ...(await metricsApi.versions()),
    };

    metricsApi.onData(storeCallback);

    watch(
      [interval, nodeUsed],
      () => {
        metricsApi.start(nodeUsed.value, interval.value);
      },
      { immediate: true }
    );
  }

  async function getStaticData() {
    return await metricsApi.get(staticData);
  }

  function storeCallback(apiData) {
    metrics.value = apiData;
  }

  async function destroy() {
    await metricsApi.stop();
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
