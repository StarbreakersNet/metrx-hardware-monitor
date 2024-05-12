<script setup>
import Versions from "@renderer/components/Versions.vue";
import { useUserStore } from "@renderer/stores/user";
import { useOsTheme } from "naive-ui";

const osThemeRef = useOsTheme();
const user = useUserStore();
const osTheme = osThemeRef;
</script>
<template>
  <n-flex align="center" vertical>
    <svg viewBox="0 0 900 200">
      <use xlink:href="@renderer/assets/icons.svg#electron" />
    </svg>
    <n-p v-if="user.isEnvDev">
      Appuyez sur
      <n-tag :bordered="false">F12</n-tag>
      pour ouvrir le devTool
    </n-p>
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
    <n-flex vertical>
      <n-card>Le thème actuel de votre système est {{ osTheme }}.</n-card>
    </n-flex>
  </n-flex>
</template>
<style lang="sass" scoped></style>
