import { getAppInfo } from "@/api/app";
import metricsApi from "@/api/metrics";
import { getChartEntries } from "@/models/chartEntries";
import { SOURCE_PARAMS } from "@/models/metricSources";
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

  // Tuiles déjà vues (id → source) : une tuile masquée reste connue même quand sa source n'est
  // plus collectée, pour savoir que l'utilisateur a masqué toutes celles de cette source.
  const knownTiles = reactive({});
  // Pages qui affichent toutes les données (Données, Sondes) : tant qu'il y en a une d'ouverte,
  // toutes les sources sont collectées.
  const fullCollectionRequests = reactive(new Set());

  /**
   * Sources collectées à chaque intervalle. La collecte suit l'affichage : les sources dont au
   * moins une tuile est visible sur l'accueil, ou toutes quand une page qui les montre est ouverte.
   */
  const nodeUsed = computed(() => {
    const sources = Object.keys(SOURCE_PARAMS).filter(source => {
      if (fullCollectionRequests.size > 0) {
        return true;
      }

      const tiles = Object.entries(knownTiles).filter(([, tileSource]) => tileSource === source);

      // Source jamais vue (premier lancement) : on la collecte pour découvrir ses tuiles
      if (!tiles.length) {
        return source !== "time";
      }
      return tiles.some(([id]) => !user.settings.chartsHidden[id]);
    });

    return Object.fromEntries(sources.map(source => [source, SOURCE_PARAMS[source]]));
  });
  // Clé stable : le sidecar n'est relancé que si la liste des sources change vraiment
  const nodeUsedKey = computed(() => JSON.stringify(nodeUsed.value));

  function requestFullCollection(name) {
    fullCollectionRequests.add(name);
  }

  function releaseFullCollection(name) {
    fullCollectionRequests.delete(name);
  }

  /** Infos statiques du processeur (si.cpu()), lues une fois quand la page Données en a besoin */
  async function loadCpuInfo() {
    if (info.value.cpu) {
      return;
    }
    try {
      const { cpu } = await metricsApi.get({ cpu: "*" });

      info.value = { ...info.value, cpu };
    } catch (error) {
      console.error("[metrics]", error);
    }
  }

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
    // Fréquence maximale du processeur, pour l'échelle et les seuils de son horloge. Sans attendre :
    // la lecture ne doit pas retarder le démarrage
    loadCpuInfo();

    watch(
      [interval, nodeUsedKey],
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

    getChartEntries(apiData).forEach(entry => {
      if (knownTiles[entry.id] !== entry.source) {
        knownTiles[entry.id] = entry.source;
      }
    });
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
    requestFullCollection,
    releaseFullCollection,
    loadCpuInfo,
  };
});
