<script setup>
import { computed, onBeforeMount, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useUserStore } from "@renderer/stores/user";
import AppUtils from "@renderer/appUtils";

const userStore = useUserStore();

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
  let version = await window.electron.getBuildType();
  console.log("[Updater]: Vérification des mises à jour pour la version " + version);
  window.electron.ipcRenderer.send("check-for-updates", {
    beta: version.includes("beta"),
  });
}

const buildType = computed(() => {
  let variable = import.meta.env.MODE;
  let label = variable.toLowerCase();

  switch (variable) {
    case "development":
      return "Dev";
    case "beta":
      return "Beta";
    case "production":
      return "Live";
    default:
      return label.charAt(0).toUpperCase() + label.slice(1);
  }
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
    <n-flex align="center" size="small">
      <n-space size="small">
        {{ buildType }}
      </n-space>
      <n-popover v-if="isHovered" :show-arrow="false" trigger="hover">
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
            @click="checkForUpdates">
            <font-awesome-icon icon="download" />
          </n-button>
        </template>
        Une mise à jour est disponible. Cliquez pour la télécharger.
      </n-popover>
    </n-flex>
  </n-tag>
</template>

<style lang="sass"></style>
