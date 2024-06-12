<script setup>
import { computed, onBeforeMount, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useUserStore } from "@renderer/stores/user";
import AppUtils from "@renderer/appUtils";
import { useSystemStore } from "@renderer/stores/system";
import { useMessage } from "naive-ui";

const userStore = useUserStore();
const systemStore = useSystemStore();

const mode = ref(import.meta.env.MODE?.toLowerCase());
const version = computed(() => "v" + systemStore.app.version);
const nMessage = useMessage();
const downloadProgress = ref({
  active: false,
  transferred: 0,
  total: 0,
  percent: 0,
  bytesPerSecond: 0,
});
const isUpdateAvailable = ref(false);
const isHovered = ref(false);
const loaders = reactive({
  main: new AppUtils.Loader(),
});
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

function initListener() {
  window.electron.ipcRenderer.on("update-available", () => {
    createMessage("success", "Mise à jour disponible");
  });

  window.electron.ipcRenderer.on("update-not-available", () => {
    createMessage("info", "Aucune mise à jour disponible");
    loaders.main.stop();
  });

  window.electron.ipcRenderer.on("update-cancelled", () => {
    createMessage("warning", "Mise à jour annulée");
    loaders.main.stop();
  });

  window.electron.ipcRenderer.on("update-check", () => {
    createMessage("loading", "Vérification des mises à jour... (actuel: " + version.value + ")");
  });

  window.electron.ipcRenderer.on("download-progress", (event, progressObj) => {
    downloadProgress.value.transferred = progressObj.transferred;
    downloadProgress.value.total = progressObj.total;
    downloadProgress.value.percent = progressObj.percent;
    downloadProgress.value.bytesPerSecond = progressObj.bytesPerSecond;

    if (!downloadProgress.value.active) {
      downloadProgress.value.active = true;
      createMessage(
        "loading",
        "Téléchargement en cours... " +
          downloadProgress.value.transferred +
          "/" +
          downloadProgress.value.total +
          " (" +
          downloadProgress.value.percent +
          "% - " +
          downloadProgress.value.bytesPerSecond +
          "octets/s)"
      );
    }
  });

  window.electron.ipcRenderer.on("update-downloaded", () => {
    downloadProgress.value.active = false;
    createMessage("success", "Mise à jour téléchargée");
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

function checkForUpdates() {
  loaders.main.start();
  window.electron.ipcRenderer.send("check-for-updates");
}

function installUpdate() {
  loaders.main.start();
  window.electron.ipcRenderer.send("install-update");
}

const buildType = computed(() => {
  if (mode.value && version.value) {
    const types = {
      stable: "Stable",
      beta: "Preview",
      alpha: "Nightly",
    };

    const typeKeys = Object.keys(types);
    const foundKey = typeKeys.find(key => version.value.includes(key));

    return foundKey ? types[foundKey] : types.stable;
  } else {
    return "loading";
  }
});
const isDev = computed(() => {
  return mode.value === "development";
});

onBeforeMount(() => {
  initListener();
});

onMounted(() => {
  if (userStore.settings.autoUpdate) {
    checkForUpdates();
  }
});

onBeforeUnmount(() => {
  removeMessage();
  window.electron.ipcRenderer.removeAllListeners("console-log");
  window.electron.ipcRenderer.removeAllListeners("update-available");
  window.electron.ipcRenderer.removeAllListeners("update-not-available");
  window.electron.ipcRenderer.removeAllListeners("update-cancelled");
  window.electron.ipcRenderer.removeAllListeners("update-check");
  window.electron.ipcRenderer.removeAllListeners("update-downloaded");
  window.electron.ipcRenderer.removeAllListeners("download-progress");
  window.electron.ipcRenderer.removeAllListeners("update-error");
});
</script>

<template>
  <n-tag
    :bordered="false"
    type="primary"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false">
    <template #avatar>
      <font-awesome-icon :icon="['fas', 'code-branch']" />
    </template>
    <font-awesome-icon v-if="buildType === 'loading'" :icon="['fas', 'spinner']" spin />
    <n-flex v-else align="center" size="small">
      <n-popover v-if="isDev" :show-arrow="false" trigger="hover">
        <template #trigger>
          <font-awesome-icon :icon="['fas', 'tools']" />
        </template>
        Environnement de développement
      </n-popover>
      <n-popover v-if="buildType" :show-arrow="false" trigger="hover">
        <template #trigger>
          {{ buildType }}
        </template>
        <template #default>Type de version</template>
      </n-popover>
      <n-popover v-if="!isUpdateAvailable" :show-arrow="false" trigger="hover">
        <template #trigger>
          <n-button
            :bordered="false"
            :loading="loaders.main.loading"
            size="tiny"
            @click="checkForUpdates">
            <font-awesome-icon icon="sync-alt" />
          </n-button>
        </template>
        Vérifier les mises à jour
      </n-popover>
      <n-popover v-if="isUpdateAvailable" :show-arrow="false" trigger="hover">
        <template #trigger>
          <n-button
            :bordered="false"
            :loading="loaders.main.loading"
            size="tiny"
            @click="installUpdate">
            <font-awesome-icon icon="download" />
          </n-button>
        </template>
        Une mise à jour est disponible. Cliquez pour l'installer.
      </n-popover>
    </n-flex>
  </n-tag>
</template>

<style lang="sass"></style>
