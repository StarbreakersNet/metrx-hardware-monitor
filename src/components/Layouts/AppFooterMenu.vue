<script setup>
import { getOsLabel, openDevTools } from "@/api/app";
import { renderAppIcon } from "@/appUtils";
import AppIcon from "@/components/Utils/AppIcon.vue";
import appMenuOptions from "@/models/appMenuOptions";
import { REPOSITORY_URL } from "@/models/repository";
import { useSystemStore } from "@/stores/system";
import { useUserStore } from "@/stores/user";
import Updater from "@/Updater.vue";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

const system = useSystemStore();
const user = useUserStore();
const router = useRouter();
const { t, locale } = useI18n();

// Modèle de bug dans la langue de l'app (.github/ISSUE_TEMPLATE), version et OS pré-remplis
const bugReportUrl = computed(() => {
  const params = new URLSearchParams({
    template: `bug_report_${locale.value}.yml`,
    version: system.app.version,
    os: getOsLabel(),
  });

  return `${REPOSITORY_URL}/issues/new?${params}`;
});

const themeSelector = computed({
  get: () => user.settings.theme === "dark",
  set: value => {
    user.settings.theme = value ? "dark" : "light";
  },
});

const version = computed(() => {
  return "v" + system.app.version;
});
const menuOptions = computed(() => {
  return appMenuOptions(version.value, t);
});
</script>

<template>
  <n-flex align="center" class="app-menu" justify="space-between">
    <n-flex align="center">
      <transition name="fade-y">
        <n-menu
          v-if="!user.settings.showSideMenu"
          :options="menuOptions"
          :render-icon="renderAppIcon"
          :value="router.currentRoute.value.name ?? null"
          class="override-horizontal"
          collapsed
          mode="horizontal"
          @update:value="router.push({ name: $event })" />
      </transition>
    </n-flex>
    <n-flex align="center" justify="end">
      <transition name="fade-y">
        <n-switch v-if="user.settings.theme !== 'system'" v-model:value="themeSelector">
          <template #checked>
            <app-icon name="moon-filled" size="1em" />
          </template>
          <template #unchecked>
            <app-icon name="sun-filled" size="1em" />
          </template>
        </n-switch>
      </transition>
      <n-tag :bordered="false" round type="primary" @click.right="openDevTools()">
        <n-popover :show-arrow="false" placement="top" trigger="hover">
          <template #trigger>
            <app-icon name="bug-filled" />
          </template>
          <template #default>
            <n-space align="center" size="small">
              <app-icon name="brand-github" />
              <n-a :href="bugReportUrl" target="_blank">
                {{ t("footer.reportIssue") }}
              </n-a>
            </n-space>
          </template>
        </n-popover>
      </n-tag>
      <n-tag v-if="user.isEnvDev" :bordered="false" round type="primary">
        <n-popover :show-arrow="false" trigger="hover">
          <template #trigger>
            <app-icon name="crane" />
          </template>
          {{ t("common.devEnvironment") }}
        </n-popover>
      </n-tag>
      <updater />
    </n-flex>
  </n-flex>
</template>

<style lang="sass" scoped>
::v-deep()
  .n-menu--horizontal
    .n-menu-item,
    .n-submenu
      margin: unset
      height: unset

      .n-menu-item-content
        height: unset
        padding: 0 1em

        .n-menu-item-content__icon
          margin: unset !important

        .n-menu-item-content-header
          display: none !important
</style>
