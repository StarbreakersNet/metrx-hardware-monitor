<script setup>
import { computed, onBeforeMount, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useUserStore } from "@renderer/stores/user";
import AppUtils from "@renderer/appUtils";
import { useSystemStore } from "@renderer/stores/system";

const userStore = useUserStore();
const systemStore = useSystemStore();

const dialogTitle = ref("Updater");
const isUpdateAvailable = ref(false);
const isHovered = ref(false);
const loaders = reactive({
  main: new AppUtils.Loader(),
});

function initListener() {
  window.electron.ipcRenderer.on("update-status", (event, message) => {
    loaders.main.stop();
    window.electron.dialog("showMessageBox", {
      type: "info",
      title: dialogTitle.value,
      message: "Mise à jour de l'application",
      detail: message,
    });
    console.log("[Updater]: " + message);
  });

  window.electron.ipcRenderer.on("download-progress", (event, progressObj) => {
    window.electron.dialog("showMessageBox", {
      type: "info",
      title: dialogTitle.value,
      message: "Téléchargement de la mise à jour",
      detail:
        "Téléchargement en cours... " +
        progressObj.transferred +
        "/" +
        progressObj.total +
        " (" +
        progressObj.percent +
        "% - " +
        progressObj.bytesPerSecond +
        "octets/s)",
    });
    console.log("[Updater]: Téléchargement en cours: " + progressObj.percent + "%");
  });

  window.electron.ipcRenderer.on("update-error", (event, message) => {
    loaders.main.stop();
    window.electron.dialog("showMessageBox", {
      type: "error",
      title: dialogTitle.value,
      message: "Erreur lors de la mise à jour",
      detail: message,
    });
    console.error("[Updater]: " + message);
  });
}

async function checkForUpdates() {
  loaders.main.start();
  let version = systemStore.info.app?.version;
  console.log("[Updater]: Vérification des mises à jour pour la version " + version);
  window.electron.ipcRenderer.send("check-for-updates", {
    beta: version.includes("beta"),
  });
}

const buildType = computed(() => {
  const mode = import.meta.env.MODE?.toLowerCase();
  const version = systemStore.info.app?.version;

  if (mode && version) {
    const types = {
      stable: "Stable",
      beta: "Beta",
      alpha: "Alpha",
    };

    for (const type in types) {
      if (version.includes(type)) {
        return types[type];
      }
    }

    return types.stable;
  } else {
    return "";
  }
});

const isDev = computed(() => {
  return import.meta.env.MODE === "development";
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
  window.electron.ipcRenderer.removeAllListeners("update-status");
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
    <n-flex v-if="buildType" align="center" size="small">
      <n-popover v-if="isDev" :show-arrow="false" trigger="hover">
        <template #trigger>
          <font-awesome-icon :icon="['fas', 'tools']" />
        </template>
        Environnement de développement
      </n-popover>
      <n-popover :show-arrow="false" trigger="hover">
        <template #trigger>
            {{ buildType }}
        </template>
        <template #default>
            Type de version
        </template>
      </n-popover>
      <n-popover :show-arrow="false" trigger="hover">
        <template #trigger>
          <n-button
            :bordered="false"
            :loading="loaders.main.loading"
            size="tiny"
            @click="checkForUpdates">
            <font-awesome-icon icon="sync-alt" />
          </n-button>
        </template>
        Cliquer pour vérifier les mises à jour
      </n-popover>
      <n-popover v-if="isUpdateAvailable" :show-arrow="false" trigger="hover">
        <template #trigger>
          <n-button
            :bordered="false"
            :loading="loaders.main.loading"
            size="tiny"
            @click="checkForUpdates">
            <font-awesome-icon icon="download" />
          </n-button>
        </template>
        Une mise à jour est disponible. Cliquez pour la télécharger.
      </n-popover>
    </n-flex>
    <font-awesome-icon v-else :icon="['fas', 'spinner']" spin />
  </n-tag>
</template>

<style lang="sass"></style>
