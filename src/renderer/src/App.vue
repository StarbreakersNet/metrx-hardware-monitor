<script setup>
import {
  getNaiveOverrideTheme,
  getNaiveTheme,
  Loader,
  preferedOsTheme,
  renderFontAwesomeIcon,
  Timer,
} from "@renderer/appUtils";
import { naiveDark, naiveLight } from "@renderer/assets/themes/naiveTheme";
import { useSystemStore } from "@renderer/stores/system";
import { useUserStore } from "@renderer/stores/user";
import { registerTheme } from "echarts";
import { computed, onBeforeMount, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import LoaderSpinner from "@renderer/components/LoaderSpinner.vue";
import AppFooterMenu from "@renderer/components/Layouts/AppFooterMenu.vue";
import appMenuOptions from "@renderer/models/appMenuOptions";
import { useEchartTheme } from "@renderer/composables/themeBuilder";
import { dateFrFR, frFR } from "naive-ui";

const PRE_TIMEOUT_TIME = 7000;
const TIMEOUT_TIME = 15000;

const loaders = reactive({
  initial: new Loader(),
});
const router = useRouter();
const system = useSystemStore();
const user = useUserStore();
const keepAliveBlacklist = [];
const initStartTimer = reactive(new Timer());
const showLoadingHints = computed(() => {
  return (
    initStartTimer.elapsedTime > PRE_TIMEOUT_TIME &&
    initStartTimer.elapsedTime < TIMEOUT_TIME - 1000
  );
});
const menuConfig = reactive({
  collapsedWidth: 64,
});
const version = computed(() => {
  return "v" + system.app.version;
});
const menuOptions = computed(() => {
  return appMenuOptions(version.value);
});
const theme = ref(getNaiveTheme());
const themeOverride = ref(getNaiveOverrideTheme());

function setAppTheme(newTheme) {
  theme.value = getNaiveTheme(newTheme);
  themeOverride.value = getNaiveOverrideTheme(newTheme);
}

watch(
  () => user.settings.theme,
  value => {
    setAppTheme(value);
    user.settings.osTheme = preferedOsTheme();
  },
  { immediate: true }
);

watch(
  () => initStartTimer.elapsedTime,
  value => {
    if (value > TIMEOUT_TIME) {
      window.location.reload();
    }
  }
);

window.electron.ipcRenderer.on("os-theme-updated", (event, theme) => {
  setAppTheme(theme);
  user.settings.osTheme = theme;
});

onBeforeMount(() => {
  loaders.initial.start();
  registerTheme("dark", useEchartTheme(naiveDark).value);
  registerTheme("light", useEchartTheme(naiveLight).value);
});

onMounted(async () => {
  initStartTimer.start();
  await system.init();
  initStartTimer.stop();
  loaders.initial.stop();
});

onBeforeUnmount(() => {
  system.destroy();
});
</script>

<template>
  <n-config-provider
    :date-locale="dateFrFR"
    :locale="frFR"
    :theme="theme"
    :theme-overrides="themeOverride"
    inline-theme-disabled>
    <n-loading-bar-provider>
      <n-message-provider :keep-alive-on-hover="true" :max="5" placement="bottom">
        <transition mode="out-in">
          <n-flex v-if="loaders.initial.loading">
            <div class="loading-view">
              <loader-spinner :size-ratio="7">
                <n-flex align="center" class="loader-title" vertical>
                  <img alt="logo" class="loader-img" src="@renderer/assets/icon-round.svg" />
                  <span>Démarrage du monitoring</span>
                  <transition name="insert">
                    <span v-if="showLoadingHints">Le chargement est long...</span>
                  </transition>
                </n-flex>
              </loader-spinner>
            </div>
          </n-flex>
          <n-flex v-else class="main-view" vertical>
            <n-layout>
              <n-layout has-sider position="absolute">
                <transition name="insert-side">
                  <n-layout-sider
                    v-if="user.settings.showSideMenu"
                    :collapsed="user.settings.sideMenuCollapsed"
                    :collapsed-width="menuConfig.collapsedWidth"
                    :native-scrollbar="false"
                    bordered
                    collapse-mode="width"
                    default-collapsed
                    show-trigger="bar"
                    width="20em"
                    @collapse="user.settings.sideMenuCollapsed = true"
                    @expand="user.settings.sideMenuCollapsed = false">
                    <n-menu
                      :collapsed="user.settings.sideMenuCollapsed"
                      :collapsed-icon-size="22"
                      :collapsed-width="menuConfig.collapsedWidth"
                      :icon-size="22"
                      :options="menuOptions"
                      :render-icon="renderFontAwesomeIcon"
                      :value="router.currentRoute.value.name ?? null"
                      @update:value="router.push({ name: $event })" />
                  </n-layout-sider>
                </transition>
                <n-layout-content :native-scrollbar="false" class="router-container">
                  <router-view #default="{ Component }" class="router-view">
                    <transition mode="out-in" name="fade-y">
                      <keep-alive :exclude="keepAliveBlacklist">
                        <component :is="Component" />
                      </keep-alive>
                    </transition>
                  </router-view>
                </n-layout-content>
              </n-layout>
            </n-layout>
            <n-layout-footer bordered class="footer-view">
              <app-footer-menu />
            </n-layout-footer>
          </n-flex>
        </transition>
      </n-message-provider>
    </n-loading-bar-provider>
    <n-global-style />
  </n-config-provider>
</template>

<style lang="sass">
@import assets/css/styles

.header-view
  padding: .25em .5em

.main-view
  height: 100vh
  gap: unset !important

.router-container
  &:before,
  &:after
    z-index: 10
    content: ""
    position: absolute
    height: 2em
    width: 100%
    backdrop-filter: blur(.5em)

  &:before
    top: 0
    background: linear-gradient(to top, transparent 0%, var(--n-color) 75%)
    mask: linear-gradient(to top, transparent 0%, var(--n-color) 50%)

  &:after
    bottom: 0
    background: linear-gradient(to bottom, transparent 0%, var(--n-color) 75%)
    mask: linear-gradient(to bottom, transparent 0%, var(--n-color) 50%)

.router-view
  padding: 2em

.footer-view
  overflow: hidden
  padding: .25em .5em

.loading-view
  position: absolute
  height: 100%
  width: 100%
  display: flex
  justify-content: center
  align-items: center

  .loader-title
    img
      z-index: -1
      position: absolute
      top: 0
      width: 100%
      height: 100%
      filter: blur(8px) brightness(.25)
</style>
