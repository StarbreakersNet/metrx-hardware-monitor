<script setup>
import LoaderSpinner from "@renderer/components/LoaderSpinner.vue";
import Versions from "@renderer/components/Versions.vue";
import { useUserStore } from "@renderer/stores/user";
import { useOsTheme } from "naive-ui";
import { computed } from "vue";

const osThemeRef = useOsTheme();
const user = useUserStore();
const osThemeLabel = computed(() => {
  switch (osThemeRef.value) {
    case "dark":
      return "sombre";
    case "light":
      return "claire";
    default:
      return null;
  }
});
const isMacos = computed(() => {
  return window.electron?.process?.platform === "darwin";
});
</script>
<template>
  <n-flex align="center" size="large" vertical>
    <loader-spinner :size-ratio="4" class="spinner" lap-duration="2s">
      <img alt="logo" class="app-icon" src="@renderer/assets/icon-round.svg" />
    </loader-spinner>
    <Versions />
    <n-flex justify="center">
      <div>
        <n-a href="https://electron-vite.org" target="_blank">Electron Vite</n-a>
      </div>
      <div class="link-item link-dot">•</div>
      <div>
        <n-a href="https://www.electronjs.org/" target="_blank">ElectronJS</n-a>
      </div>
      <div class="link-item link-dot">•</div>
      <div>
        <n-a href="https://vuejs.org/guide/introduction.html" target="_blank">Vue.js</n-a>
      </div>
      <div class="link-item link-dot">•</div>
      <div>
        <n-a href="https://systeminformation.io/general.html" target="_blank">
          SystemInformation.io
        </n-a>
      </div>
      <div class="link-item link-dot">•</div>
      <div>
        <n-a href="https://www.naiveui.com/" target="_blank">Naive UI</n-a>
      </div>
      <div class="link-item link-dot">•</div>
      <div>
        <n-a href="https://echarts.apache.org/en/index.html" target="_blank">Apache Echarts</n-a>
      </div>
    </n-flex>
    <n-flex align="center" vertical>
      <n-alert v-if="user.isEnvDev" type="info">
        <template #header>
          <span>Environnement de développement</span>
        </template>
        <template #default>
          Appuyez sur
          <n-tag v-if="isMacos" :bordered="false">⌘ + ⌥ + i</n-tag>
          <n-tag v-else :bordered="false">CTRL + SHIFT + i</n-tag>
          pour ouvrir les outils de devs.
        </template>
      </n-alert>
      <n-card>Le thème actuel de votre système est {{ osThemeLabel }}.</n-card>
    </n-flex>
  </n-flex>
</template>
<style lang="sass" scoped>
.app-icon
  position: absolute
  width: 12em
  height: 12em

.spinner
  margin: 2em
</style>
