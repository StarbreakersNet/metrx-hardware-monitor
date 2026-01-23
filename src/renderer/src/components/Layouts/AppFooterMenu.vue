<script setup>
import { renderAppIcon } from "@renderer/appUtils";
import AppIcon from "@renderer/components/Utils/AppIcon.vue";
import appMenuOptions from "@renderer/models/appMenuOptions";
import { useSystemStore } from "@renderer/stores/system";
import { useUserStore } from "@renderer/stores/user";
import Updater from "@renderer/Updater.vue";
import { computed } from "vue";
import { useRouter } from "vue-router";

const system = useSystemStore();
const user = useUserStore();
const router = useRouter();

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
  return appMenuOptions(version.value);
});

function openDevtools() {
  window.electron.app.openDevTools();
}
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
      <n-tag :bordered="false" round type="primary" @click.right="openDevtools">
        <n-popover :show-arrow="false" placement="top" trigger="hover">
          <template #trigger>
            <app-icon name="bug-filled" />
          </template>
          <template #default>
            <n-space align="center" size="small">
              <app-icon name="brand-github" />
              <n-a
                href="https://github.com/StarbreakersNet/metrx-hardware-monitor/issues/new/choose"
                target="_blank">
                Signaler un problème sur GitHub
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
          Environnement de développement
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
