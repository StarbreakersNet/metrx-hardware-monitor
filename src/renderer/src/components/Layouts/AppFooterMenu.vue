<script setup>
import Updater from "@renderer/Updater.vue";
import { computed, ref, watch } from "vue";
import { useUserStore } from "@renderer/stores/user";
import { darkTheme } from "naive-ui";
import appMenuOptions from "@renderer/models/appMenuOptions";
import { useSystemStore } from "@renderer/stores/system";
import { renderFontAwesomeIcon } from "@renderer/appUtils";
import { useRouter } from "vue-router";

const system = useSystemStore();
const user = useUserStore();
const router = useRouter();

const themeSelector = ref(!!user.settings.theme);

watch(themeSelector, value => {
  if (value) {
    user.settings.theme = darkTheme;
    user.settings.isDark = true;
  } else {
    user.settings.theme = null;
    user.settings.isDark = false;
  }
});

const version = computed(() => {
  return "v" + system.app.version;
});
const menuOptions = computed(() => {
  // return [
  //   {
  //     label: "Menu",
  //     key: "menu",
  //     fas: "bars",
  //     children: appMenuOptions(version.value),
  //   },
  // ];
  return appMenuOptions(version.value);
});

function toggleMenu() {
  user.settings.showSideMenu = !user.settings.showSideMenu;
}

function openDevtools() {
  window.electron.app.openDevTools();
}
</script>

<template>
  <n-flex align="center" class="app-menu" justify="space-between">
    <n-flex align="center">
      <transition name="fade-y">
        <div v-if="!user.settings.showSideMenu">
          <n-menu
            :options="menuOptions"
            :render-icon="renderFontAwesomeIcon"
            mode="horizontal"
            @update:value="router.push({ name: $event })" />
        </div>
      </transition>
    </n-flex>
    <n-flex align="center" justify="end">
      <n-switch v-model:value="themeSelector">
        <template #checked>
          <font-awesome-icon :icon="['fas', 'moon']" />
        </template>
        <template #unchecked>
          <font-awesome-icon :icon="['fas', 'sun']" />
        </template>
      </n-switch>
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
    width: unset
    max-width: unset

    .n-menu-item
      height: unset

      .n-menu-item-content
        height: unset

    .n-submenu
      .n-menu-item
        height: unset
</style>
