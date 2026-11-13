<script setup>
import {
  checkForUpdates as checkUpdates,
  installUpdate as installDownloadedUpdate,
  waitForNetwork,
} from "@/api/updater";
import AppUtils, { delay, formatBytes } from "@/appUtils";
import AppIcon from "@/components/Utils/AppIcon.vue";
import { useSystemStore } from "@/stores/system";
import { useUserStore } from "@/stores/user";
import { useMessage, useThemeVars } from "naive-ui";
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const user = useUserStore();
const system = useSystemStore();
const theme = useThemeVars();
const { t } = useI18n();

const version = computed(() => "v" + system.app.version);
const nMessage = useMessage();
const downloadProgress = reactive({
  active: false,
  transferred: "",
  total: "",
  bytesPerSecond: "",
  percent: 0,
});
const isUpdateAvailable = ref(false);
const loaders = reactive({
  main: new AppUtils.Loader(),
});
const silentUpdate = ref(false);
let message = null;

// Au démarrage de l'ordinateur, Metrx s'ouvre souvent avant que le réseau soit connecté : la
// vérification automatique attend la connexion, puis qu'Internet réponde (le DNS peut ne pas
// être prêt alors que le Wi-Fi est connecté). Si elle échoue quand même (GitHub injoignable,
// portail captif...), elle est retentée plus tard, sans erreur.
const NETWORK_WAIT_TIMEOUT = 2 * 60;
const SILENT_RETRY_DELAY = 60 * 1000;
const SILENT_RETRY_MAX = 5;
let silentRetryAttempt = 0;
let silentRetryTimer = null;
let onlineListener = null;
// Incrémenté à chaque annulation, pour ignorer une attente du réseau devenue inutile
let networkWaitId = 0;

// Metrx peut rester des jours dans la barre des menus sans redémarrer : tant que la mise à jour
// auto est activée, la vérification silencieuse est refaite toutes les 6 h. Le minuteur passe
// plus souvent et compare l'heure de la dernière vérification, pour rattraper une mise en veille
// de l'ordinateur (un minuteur de 6 h repartirait de zéro au réveil).
const PERIODIC_CHECK_INTERVAL = 6 * 60 * 60 * 1000;
const PERIODIC_CHECK_TICK = 15 * 60 * 1000;
let lastCheckAt = 0;
let periodicCheckTimer = null;

function startPeriodicCheck() {
  stopPeriodicCheck();
  periodicCheckTimer = setInterval(onPeriodicCheckTick, PERIODIC_CHECK_TICK);
}

function stopPeriodicCheck() {
  clearInterval(periodicCheckTimer);
  periodicCheckTimer = null;
}

/** Vérification automatique, sauf si une autre est en cours ou qu'une mise à jour attend déjà */
function checkSilentlyIfIdle() {
  if (isUpdateAvailable.value || loaders.main.loading) {
    return;
  }

  silentRetryAttempt = 0;
  checkWhenOnline();
}

function onPeriodicCheckTick() {
  // Une nouvelle tentative ou l'attente du réseau est déjà prévue
  if (silentRetryTimer || onlineListener) {
    return;
  }

  if (user.settings.autoUpdate && Date.now() - lastCheckAt >= PERIODIC_CHECK_INTERVAL) {
    console.log("[Updater]: Periodic update check");
    checkSilentlyIfIdle();
  }
}

function checkWhenOnline() {
  cancelSilentRetry();

  if (navigator.onLine) {
    checkWhenReachable();
    return;
  }

  console.log("[Updater]: Waiting for the network to check for updates");
  onlineListener = () => {
    onlineListener = null;
    checkWhenReachable();
  };
  window.addEventListener("online", onlineListener, { once: true });
}

async function checkWhenReachable() {
  const waitId = networkWaitId;
  let reachable = false;

  try {
    reachable = await waitForNetwork(NETWORK_WAIT_TIMEOUT);
  } catch (error) {
    console.error("[Updater]:", String(error));
  }

  if (waitId !== networkWaitId) {
    return;
  }
  if (!reachable) {
    console.log("[Updater]: Internet still unreachable, checking for updates anyway");
  }
  checkForUpdates(true);
}

function scheduleSilentRetry() {
  if (silentRetryAttempt >= SILENT_RETRY_MAX) {
    return;
  }

  silentRetryAttempt++;
  console.log(`[Updater]: Silent check failed, retrying in ${SILENT_RETRY_DELAY / 1000}s`);
  silentRetryTimer = setTimeout(checkWhenOnline, SILENT_RETRY_DELAY);
}

function cancelSilentRetry() {
  networkWaitId++;
  clearTimeout(silentRetryTimer);
  silentRetryTimer = null;

  if (onlineListener) {
    window.removeEventListener("online", onlineListener);
    onlineListener = null;
  }
}

function createMessage(type, content) {
  removeMessage();
  switch (type) {
    case "loading":
      message = nMessage.loading(content, {
        duration: 0,
        closable: false,
        keepAliveOnHover: true,
      });
      break;
    case "success":
      message = nMessage.success(content, {
        duration: 1000,
        closable: false,
        keepAliveOnHover: true,
      });
      break;
    case "warning":
      message = nMessage.warning(content, {
        duration: 5000,
        closable: false,
        keepAliveOnHover: true,
      });
      break;
    case "error":
      message = nMessage.error(
        content.split("\n")[0] + (content.split("\n").length > 1 ? "..." : ""),
        {
          duration: 0,
          closable: true,
          keepAliveOnHover: true,
        }
      );
      break;
    default:
      message = nMessage.info(content, {
        duration: 3000,
        closable: false,
        keepAliveOnHover: true,
      });
      break;
  }
}

function removeMessage() {
  if (message) {
    message.destroy();
    message = null;
  }
}

function onUpdaterEvent({ event, data }) {
  switch (event) {
    case "checking":
      if (!silentUpdate.value) {
        createMessage("loading", t("updater.checking", { version: version.value }));
      }
      break;

    case "available":
      if (!silentUpdate.value) {
        createMessage("success", t("updater.available"));
      }
      break;

    case "notAvailable":
      if (!silentUpdate.value) {
        createMessage("info", t("updater.notAvailable"));
      }
      loaders.main.stop();
      break;

    case "cancelled":
      if (!silentUpdate.value) {
        createMessage("warning", t("updater.cancelled", { message: data.message }));
      }
      loaders.main.stop();
      break;

    case "progress":
      onDownloadProgress(data);
      break;

    case "downloaded":
      onUpdateDownloaded();
      break;

    case "error":
      console.error("[Updater]:", data.message);
      loaders.main.stop();
      if (silentUpdate.value) {
        scheduleSilentRetry();
      } else {
        createMessage("error", t("updater.error", { message: data.message }));
      }
      break;

    case "log":
      console.log("[Updater]:", data.message);
      break;
  }
}

function onDownloadProgress(progress) {
  let formatedTransferred = formatBytes(progress.transferred);
  let formatedTotal = formatBytes(progress.total);
  let formatedBytesPerSecond = formatBytes(progress.bytesPerSecond);
  let roundedPercent = Math.round(progress.percent);

  downloadProgress.transferred = formatedTransferred.value + " " + formatedTransferred.unit;
  downloadProgress.total = formatedTotal.value + " " + formatedTotal.unit;
  downloadProgress.bytesPerSecond =
    formatedBytesPerSecond.value + " " + formatedBytesPerSecond.unit + "/s";
  downloadProgress.percent = roundedPercent;

  if (!downloadProgress.active) {
    downloadProgress.active = true;
    if (!silentUpdate.value) {
      createMessage(
        "loading",
        t("updater.downloading", {
          transferred: downloadProgress.transferred,
          total: downloadProgress.total,
          percent: downloadProgress.percent,
          speed: downloadProgress.bytesPerSecond,
        })
      );
    }
  }
}

async function onUpdateDownloaded() {
  downloadProgress.transferred = downloadProgress.total;
  downloadProgress.percent = 100;
  await delay(250);

  downloadProgress.active = false;
  if (!silentUpdate.value) {
    createMessage("success", t("updater.downloaded"));
  }
  loaders.main.stop();
  isUpdateAvailable.value = true;
}

async function checkForUpdates(isSilent = false) {
  cancelSilentRetry();
  if (!isSilent) {
    silentRetryAttempt = 0;
  }
  silentUpdate.value = isSilent;
  lastCheckAt = Date.now();
  loaders.main.start();

  try {
    await checkUpdates(user.settings.updateChannel, onUpdaterEvent);
  } catch (error) {
    onUpdaterEvent({ event: "error", data: { message: String(error) } });
  }
}

async function installUpdate() {
  // L'installation est demandée par l'utilisateur : ses erreurs doivent s'afficher
  silentUpdate.value = false;
  loaders.main.start();

  try {
    await installDownloadedUpdate();
  } catch (error) {
    onUpdaterEvent({ event: "error", data: { message: String(error) } });
  }
}

// Les versions Live / Preview / Nightly viennent exclusivement des tags de release (voir
// .github/workflows/deploy.yml) : tout le reste (ex : 0.0.0-dev) est une version de dev.
const buildType = computed(() => {
  if (system.app.version) {
    const types = {
      stable: {
        label: "Live",
        icon: "boltFilled",
        pattern: /^\d+\.\d+\.\d+$/,
      },
      beta: {
        label: "Preview",
        icon: "flaskFilled",
        pattern: /^\d+\.\d+\.\d+-beta(\.\d+)?$/,
      },
      alpha: {
        label: "Nightly",
        icon: "radioactiveFilled",
        pattern: /^\d+\.\d+\.\d+-alpha(\.\d+)?$/,
      },
      dev: {
        label: "Dev",
        icon: "code",
      },
    };

    const typeKeys = Object.keys(types);
    const foundKey = typeKeys.find(key => types[key].pattern?.test(system.app.version));

    return foundKey ? types[foundKey] : types.dev;
  } else {
    return "loading";
  }
});

onMounted(() => {
  if (user.settings.autoUpdate) {
    checkWhenOnline();
  }
  startPeriodicCheck();
});

onBeforeUnmount(() => {
  stopPeriodicCheck();
  cancelSilentRetry();
  removeMessage();
});

// Activer la mise à jour auto vérifie tout de suite ; la désactiver annule les nouvelles tentatives
watch(
  () => user.settings.autoUpdate,
  enabled => {
    if (enabled) {
      checkSilentlyIfIdle();
    } else {
      cancelSilentRetry();
    }
  }
);

watch(
  () => user.settings.updateChannel,
  () => {
    checkForUpdates(false);
  }
);
</script>

<template>
  <n-tag :bordered="false" round type="primary">
    <n-flex align="center" size="small">
      <n-popover v-if="buildType !== 'loading'" :show-arrow="false" trigger="hover">
        <template #trigger>
          <app-icon :name="buildType.icon" />
        </template>
        <template #default>
          {{ t("updater.buildVersion", { type: buildType.label, version }) }}
        </template>
      </n-popover>
      <app-icon
        v-if="buildType === 'loading'"
        class="tw:animate-spin"
        name="compassFilled"
        size="1.25em" />
      <transition v-else mode="out-in" name="insert">
        <div v-if="!isUpdateAvailable">
          <n-popover :show-arrow="false" trigger="hover">
            <template #trigger>
              <n-button
                :bordered="false"
                :loading="loaders.main.loading"
                size="tiny"
                @click="checkForUpdates()">
                <template #icon>
                  <app-icon name="refresh" />
                </template>
              </n-button>
            </template>
            <template #default>{{ t("updater.check") }}</template>
          </n-popover>
        </div>
        <n-flex v-else :size="0" align="center">
          <n-text class="update-subtitle">{{ t("updater.newVersion") }}</n-text>
          <n-popover :show-arrow="false" trigger="hover">
            <template #trigger>
              <n-button
                :bordered="false"
                :loading="loaders.main.loading"
                size="tiny"
                @click="installUpdate()">
                <template #icon>
                  <app-icon
                    :color="theme.warningColor"
                    class="tw:animate-pulse"
                    name="download"
                    size="1.5em" />
                </template>
              </n-button>
            </template>
            <template #default>{{ t("updater.install") }}</template>
          </n-popover>
        </n-flex>
      </transition>
    </n-flex>
  </n-tag>
</template>

<style lang="sass">
.update-subtitle
  font-size: 0.8em
  font-weight: 400
  color: var(--n-color-text)
</style>
