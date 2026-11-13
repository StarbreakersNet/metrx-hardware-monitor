import { getAppInfo } from "@/api/app";
import { getDesktopSettings, onDesktopSettingChanged, setDesktopSetting } from "@/api/desktop";
import { defineStore } from "pinia";
import { computed, reactive, watch } from "vue";

let desktopListenerRegistered = false;

function getDefaultUserSettings() {
  return {
    theme: "system",
    osTheme: null,
    autoUpdate: false,
    updateChannel: getDefaultUpdateChannel(),
    nodeFrequency: 1000,
    chartFrequency: 1000,
    chartColumns: 2,
    chartHeight: 10,
    chartBufferSize: 5,
    chartAnimation: false,
    chartCursorSync: false,
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
    chartsSettings: [],
    chartsOrder: {},
    chartsMerged: {},
    chartsColors: {},
    // Tuiles masquées par l'utilisateur (page Sondes) : id → true. Toutes sont visibles par défaut
    chartsHidden: {},
    // Page Données : vue choisie (summary, table, detailed) et affichage des clés de la lib
    statsView: "summary",
    statsShowKeys: true,
  };
}

/** Canal de mise à jour déduit de la version : 2.0.0 → latest, 2.0.0-beta.1 → beta */
function getDefaultUpdateChannel() {
  const subVersion = getAppInfo().version.split("-")[1] ?? "";
  const channel = /^(alpha|beta)/.exec(subVersion)?.[1];

  return channel ?? "latest";
}

export const useUserStore = defineStore(
  "user",
  () => {
    const desktop = reactive(getDesktopSettings());
    const settings = reactive(getDefaultUserSettings());

    const isEnvDev = computed(() => {
      return import.meta.env.DEV;
    });

    // Répercute les changements de l'interface vers les réglages système (Rust)
    for (const key in desktop) {
      watch(
        () => desktop[key],
        value => {
          if (getDesktopSettings()[key] !== value) {
            setDesktopSetting(key, value);
          }
        }
      );
    }

    // Et inversement, quand un réglage est modifié depuis le tray
    if (!desktopListenerRegistered) {
      onDesktopSettingChanged((key, value) => {
        desktop[key] = value;
      });
      desktopListenerRegistered = true;
    }

    /**
     * Intervalle effectif des courbes : jamais plus court que celui des sondes, sinon les
     * nouveaux points répéteraient la même valeur.
     */
    const chartInterval = computed(() =>
      Math.max(settings.chartFrequency ?? settings.nodeFrequency, settings.nodeFrequency)
    );

    function resetAllSettings() {
      Object.assign(settings, getDefaultUserSettings());
    }

    return {
      desktop,
      settings,
      isEnvDev,
      chartInterval,
      resetAllSettings,
      getDefaultUpdateChannel,
    };
  },
  {
    persist: {
      pick: ["settings"],
      beforeHydrate: context => {
        const { store } = context;
        const defaultSettings = getDefaultUserSettings();
        let hasChanges = false;

        try {
          // Get data from storage
          const storedDataStr = localStorage.getItem(store.$id);

          if (storedDataStr) {
            const storedData = JSON.parse(storedDataStr);

            if (storedData.settings) {
              // Loop through all keys in settings
              Object.keys(storedData.settings).forEach(key => {
                // If key doesn't exist in default settings, it's obsolete
                if (!(key in defaultSettings)) {
                  if (!hasChanges) {
                    console.group("Store " + store.$id);
                  }
                  console.log("🗑️ Cleaning old key: " + key);
                  delete storedData.settings[key];
                  hasChanges = true;
                }
              });

              // Save modifications if keys have been deleted
              if (hasChanges) {
                localStorage.setItem(store.$id, JSON.stringify(storedData));
                console.log("✅ Cleaning of obsolete keys completed");
              }
            }
          }
        } catch (error) {
          console.error("Error while cleaning persisted data:", error);
        } finally {
          if (hasChanges) {
            console.groupEnd();
          }
        }
      },
    },
  }
);
