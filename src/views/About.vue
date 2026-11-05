<script setup>
import { currentPlatform } from "@/api/app";
import LoaderSpinner from "@/components/LoaderSpinner.vue";
import { LICENSE_URL, REPOSITORY_URL } from "@/models/repository";
import Versions from "@/components/Versions.vue";
import { useUserStore } from "@/stores/user";
import { useOsTheme } from "naive-ui";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const osThemeRef = useOsTheme();
const user = useUserStore();
const { t } = useI18n();
const currentYear = new Date().getFullYear();
const osThemeLabel = computed(() => {
  switch (osThemeRef.value) {
    case "dark":
      return t("about.themeDark");
    case "light":
      return t("about.themeLight");
    default:
      return null;
  }
});
const isMacos = computed(() => {
  return currentPlatform === "macos";
});
</script>
<template>
  <n-flex align="center" size="large" vertical>
    <loader-spinner :size-ratio="4" class="spinner" lap-duration="2s">
      <img alt="logo" class="app-icon" src="@/assets/icon-round.svg" />
    </loader-spinner>
    <Versions />
    <n-flex justify="center">
      <div>
        <n-a href="https://tauri.app" target="_blank">Tauri</n-a>
      </div>
      <div class="link-item link-dot">•</div>
      <div>
        <n-a href="https://bun.sh" target="_blank">Bun</n-a>
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
        <n-a href="https://www.naiveui.com" target="_blank">Naive UI</n-a>
      </div>
      <div class="link-item link-dot">•</div>
      <div>
        <n-a href="https://tabler.io/icons" target="_blank">Tabler Icons</n-a>
      </div>
      <div class="link-item link-dot">•</div>
      <div>
        <n-a href="https://www.chartjs.org" target="_blank">Chart.js</n-a>
      </div>
    </n-flex>
    <n-flex vertical>
      <n-alert v-if="user.isEnvDev" type="info">
        <template #header>
          <span>{{ t("common.devEnvironment") }}</span>
        </template>
        <template #default>
          <i18n-t keypath="about.devToolsHint" scope="global" tag="span">
            <template #shortcut>
              <n-tag v-if="isMacos" :bordered="false">⌘ + ⌥ + i</n-tag>
              <n-tag v-else :bordered="false">CTRL + SHIFT + i</n-tag>
            </template>
          </i18n-t>
        </template>
      </n-alert>
      <n-alert type="info">
        <template #header>{{ t("about.refreshTitle") }}</template>
        <template #default>
          <i18n-t keypath="about.refreshHint" scope="global" tag="span">
            <template #shortcut>
              <n-tag v-if="isMacos" :bordered="false">⌘ + r</n-tag>
              <n-tag v-else :bordered="false">CTRL + r</n-tag>
            </template>
          </i18n-t>
        </template>
      </n-alert>
      <n-card>{{ t("about.osTheme", { theme: osThemeLabel }) }}</n-card>
      <!-- Mention de licence recommandée par la GPL pour les applications avec une interface -->
      <n-card size="small">
        <n-flex size="small" vertical>
          <n-text strong>{{ t("about.legal.copyright", { year: currentYear }) }}</n-text>
          <i18n-t keypath="about.legal.license" scope="global" tag="span">
            <template #license>
              <n-a :href="LICENSE_URL" target="_blank">{{ t("about.legal.licenseName") }}</n-a>
            </template>
          </i18n-t>
          <n-a :href="REPOSITORY_URL" target="_blank">{{ t("about.legal.sourceCode") }}</n-a>
        </n-flex>
      </n-card>
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
