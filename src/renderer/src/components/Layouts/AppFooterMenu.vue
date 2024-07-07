<script setup>
import Updater from "@renderer/Updater.vue";
import { computed, watch } from "vue";
import { useUserStore } from "@renderer/stores/user";
// import { darkTheme, lightTheme } from "naive-ui";
import appMenuOptions from "@renderer/models/appMenuOptions";
import { useSystemStore } from "@renderer/stores/system";
import { useRouter } from "vue-router";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { renderFontAwesomeIcon } from "@renderer/appUtils";

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
          :render-icon="renderFontAwesomeIcon"
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
            <font-awesome-icon :icon="['fas', 'moon']" />
          </template>
          <template #unchecked>
            <font-awesome-icon :icon="['fas', 'sun']" />
          </template>
        </n-switch>
      </transition>
      <n-tag :bordered="false" type="primary" @click.right="openDevtools">
        <n-popover :show-arrow="false" placement="top" trigger="hover">
          <template #trigger>
            <font-awesome-icon :icon="['fas', 'bug']" />
          </template>
          <template #default>
            <n-space size="small">
              <font-awesome-icon :icon="['fab', 'gitlab']" />
              <n-a
                href="https://gitlab.com/starbreakersdevteam/sb-hardware-monitor/-/issues/new"
                target="_blank">
                Signaler un problème par GitLab
              </n-a>
            </n-space>
          </template>
          <template #footer>
            <n-space size="small">
              <font-awesome-icon :icon="['fas', 'envelope']" />
              <n-a
                href="mailto:contact-project+starbreakersdevteam-sb-hardware-monitor-33549653-issue-@incoming.gitlab.com">
                Signaler un problème par mail
              </n-a>
            </n-space>
          </template>
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
