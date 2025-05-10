<script setup>
import AppUtils, { formatBytes } from "@renderer/appUtils";
import AppIcon from "@renderer/components/Utils/AppIcon.vue";
import { useSystemStore } from "@renderer/stores/system";
import { useUserStore } from "@renderer/stores/user";
import { useMessage, useThemeVars } from "naive-ui";
import { computed, onBeforeMount, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";

const user = useUserStore();
const system = useSystemStore();
const theme = useThemeVars();

const mode = ref(import.meta.env.MODE?.toLowerCase());
const version = computed(() => "v" + system.app.version);
const nMessage = useMessage();
const downloadProgress = ref({
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
      message = nMessage.error(content, {
        duration: 0,
        closable: true,
        keepAliveOnHover: true,
      });
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

function clearAllListeners() {
  window.electron.ipcRenderer.removeAllListeners("console-log");
  window.electron.ipcRenderer.removeAllListeners("update-available");
  window.electron.ipcRenderer.removeAllListeners("update-not-available");
  window.electron.ipcRenderer.removeAllListeners("update-cancelled");
  window.electron.ipcRenderer.removeAllListeners("update-check");
  window.electron.ipcRenderer.removeAllListeners("update-downloaded");
  window.electron.ipcRenderer.removeAllListeners("download-progress");
  window.electron.ipcRenderer.removeAllListeners("update-error");
}

function initListener() {
  clearAllListeners();
  window.electron.ipcRenderer.on("update-available", () => {
    if (!silentUpdate.value) {
      createMessage("success", "Mise à jour disponible");
    }
  });

  window.electron.ipcRenderer.on("update-not-available", () => {
    if (!silentUpdate.value) {
      createMessage("info", "Aucune mise à jour disponible");
    }
    loaders.main.stop();
  });

  window.electron.ipcRenderer.on("update-cancelled", (event, message) => {
    if (!silentUpdate.value) {
      createMessage("warning", "Mise à jour annulée. " + message);
    }
    loaders.main.stop();
  });

  window.electron.ipcRenderer.on("update-check", () => {
    if (!silentUpdate.value) {
      createMessage("loading", "Vérification des mises à jour... (actuel: " + version.value + ")");
    }
  });

  window.electron.ipcRenderer.on("download-progress", (event, progressObj) => {
    let formatedTransferred = formatBytes(progressObj.transferred);
    let formatedTotal = formatBytes(progressObj.total);
    let formatedBytesPerSecond = formatBytes(progressObj.bytesPerSecond);
    let roundedPercent = Math.round(progressObj.percent);

    downloadProgress.value.transferred = formatedTransferred.value + " " + formatedTransferred.unit;
    downloadProgress.value.total = formatedTotal.value + " " + formatedTotal.unit;
    downloadProgress.value.bytesPerSecond =
      formatedBytesPerSecond.value + " " + formatedBytesPerSecond.unit + "/s";
    downloadProgress.value.percent = roundedPercent;

    if (!downloadProgress.value.active) {
      downloadProgress.value.active = true;
      if (!silentUpdate.value) {
        createMessage(
          "loading",
          "Téléchargement en cours... " +
            downloadProgress.value.transferred +
            "/" +
            downloadProgress.value.total +
            " (" +
            roundedPercent +
            "% - " +
            downloadProgress.value.bytesPerSecond +
            ")"
        );
      }
    }
  });

  window.electron.ipcRenderer.on("update-downloaded", () => {
    downloadProgress.value.active = false;
    if (!silentUpdate.value) {
      createMessage("success", "Mise à jour téléchargée");
    }
    loaders.main.stop();
    isUpdateAvailable.value = true;
  });

  window.electron.ipcRenderer.on("update-error", (event, message) => {
    createMessage("error", "Erreur lors de la mise à jour. " + message);
    console.error("[Updater]:", message, event);
    loaders.main.stop();
  });

  window.electron.ipcRenderer.on("update-log", (event, message) => {
    console.log("[Updater]:", message, event);
  });
}

function checkForUpdates(isSilent = false) {
  silentUpdate.value = isSilent;
  loaders.main.start();
  window.electron.ipcRenderer.send("check-for-updates", user.settings.updateChanel);
}

function installUpdate() {
  loaders.main.start();
  window.electron.ipcRenderer.send("install-update");
}

const buildType = computed(() => {
  if (mode.value && version.value) {
    const types = {
      stable: {
        label: "Live",
        icon: "boltFilled",
      },
      beta: {
        label: "Preview",
        icon: "flaskFilled",
      },
      alpha: {
        label: "Nightly",
        icon: "radioactiveFilled",
      },
    };

    const typeKeys = Object.keys(types);
    const foundKey = typeKeys.find(key => version.value.includes(key));

    return foundKey ? types[foundKey] : types.stable;
  } else {
    return "loading";
  }
});

onBeforeMount(() => {
  initListener();
});

onMounted(() => {
  if (user.settings.autoUpdate) {
    checkForUpdates(true);
  }
});

onBeforeUnmount(() => {
  removeMessage();
  clearAllListeners();
});

watch(
  () => user.settings.updateChanel,
  () => {
    checkForUpdates(false);
  }
);
</script>

<template>
  <n-tag :bordered="false" round type="primary">
    <n-flex align="center" size="small">
      <n-popover v-if="buildType" :show-arrow="false" trigger="hover">
        <template #trigger>
          <app-icon :name="buildType.icon" />
        </template>
        <template #default>Version {{ buildType.label.toLowerCase() }} {{ version }}</template>
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
            <template #default>Vérifier les mises à jour</template>
          </n-popover>
        </div>
        <n-flex v-else :size="0" align="center">
          <n-text class="update-subtitle">Nouvelle version disponible</n-text>
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
            <template #default>Une mise à jour est disponible. Cliquez pour l'installer.</template>
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
