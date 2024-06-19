<script setup>
import { Loader, renderFontAwesomeIcon } from "@renderer/appUtils";
import echartDark from "@renderer/assets/themes/echart.dark.json";
import echartLight from "@renderer/assets/themes/echart.light.json";
import naiveDark from "@renderer/assets/themes/naive.dark.json";
import naiveLight from "@renderer/assets/themes/naive.light.json";
import { useSystemStore } from "@renderer/stores/system";
import { useUserStore } from "@renderer/stores/user";
import { registerTheme } from "echarts";
import { computed, onBeforeMount, onBeforeUnmount, reactive } from "vue";
import { useRouter } from "vue-router";
import LoaderSpinner from "@renderer/components/LoaderSpinner.vue";
import AppFooterMenu from "@renderer/components/Layouts/AppFooterMenu.vue";
import appMenuOptions from "@renderer/models/appMenuOptions";

const loaders = reactive({
  initial: new Loader(),
});
const router = useRouter();
const system = useSystemStore();
const user = useUserStore();
const keepAliveBlacklist = [];
const menuConfig = reactive({
  collapsedWidth: 64,
});
const version = computed(() => {
  return "v" + system.app.version;
});
const menuOptions = computed(() => {
  return appMenuOptions(version.value);
});

onBeforeMount(() => {
  registerTheme("dark", echartDark);
  registerTheme("light", echartLight);
  loaders.initial.start();
});

onBeforeMount(async () => {
  await system.init();
  loaders.initial.stop();
});

onBeforeUnmount(() => {
  system.destroy();
});
</script>

<template>
  <n-config-provider
    :theme="user.settings.theme"
    :theme-overrides="user.settings.theme ? naiveDark : naiveLight"
    inline-theme-disabled>
    <n-loading-bar-provider>
      <n-message-provider :keep-alive-on-hover="true" :max="5" placement="bottom">
        <transition mode="out-in">
          <n-flex v-if="loaders.initial.loading">
            <div class="loading-view">
              <loader-spinner :size-ratio="7">
                <n-flex vertical>Démarrage du monitoring</n-flex>
              </loader-spinner>
            </div>
          </n-flex>
          <n-flex v-else class="main-view" vertical>
            <n-layout>
              <n-layout has-sider position="absolute">
                <transition name="insert-side">
                  <n-layout-sider
                    v-if="user.settings.showSideMenu"
                    :collapsed-width="menuConfig.collapsedWidth"
                    :native-scrollbar="false"
                    bordered
                    collapse-mode="width"
                    default-collapsed
                    show-trigger="bar"
                    width="20em">
                    <n-menu
                      :collapsed-icon-size="22"
                      :collapsed-width="menuConfig.collapsedWidth"
                      :options="menuOptions"
                      :render-icon="renderFontAwesomeIcon"
                      @update:value="router.push({ name: $event })" />
                  </n-layout-sider>
                </transition>
                <n-layout-content :native-scrollbar="false">
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

.router-view
  padding: 1em 2em

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
</style>
