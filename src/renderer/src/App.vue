<script setup>
import { renderFontAwesomeIcon } from "@renderer/appUtils";
import echartDark from "@renderer/assets/themes/echart.dark.json";
import echartLight from "@renderer/assets/themes/echart.light.json";
import naiveDark from "@renderer/assets/themes/naive.dark.json";
import naiveLight from "@renderer/assets/themes/naive.light.json";
import { useSystemStore } from "@renderer/stores/system";
import { useUserStore } from "@renderer/stores/user";
import { registerTheme } from "echarts";
import { darkTheme } from "naive-ui";
import { computed, onBeforeMount, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import Updater from "@renderer/Updater.vue";

const router = useRouter();
const system = useSystemStore();
const user = useUserStore();
const keepAliveBlacklist = [];
const showMenu = ref(true);
const menuConfig = reactive({
  collapsedWidth: 64,
});
const version = computed(() => {
  return "v" + system.app.version;
});
const menuOptions = computed(() => {
  return [
    {
      label: "Accueil",
      key: "home",
      fas: "home",
    },
    {
      label: "Données",
      key: "nodes",
      fas: "table",
    },
    {
      label: "Paramètres",
      key: "settings",
      fas: "gear",
    },
    {
      label: "Autres",
      key: "other",
      fas: "ellipsis-vertical",
      children: [
        {
          label: "À propos",
          key: "about",
        },
        {
          type: "group",
          label: version.value,
          key: "version",
          disabled: true,
        },
      ],
    },
  ];
});
const themeSelector = ref(!!user.settings.theme);

function toggleMenu() {
  showMenu.value = !showMenu.value;
}

function openDevtools() {
  window.electron.app.openDevTools();
}

watch(themeSelector, value => {
  if (value) {
    user.settings.theme = darkTheme;
    user.settings.isDark = true;
  } else {
    user.settings.theme = null;
    user.settings.isDark = false;
  }
});

onBeforeMount(() => {
  registerTheme("dark", echartDark);
  registerTheme("light", echartLight);
});

onBeforeMount(async () => {
  await system.init();
});
</script>

<template>
  <n-config-provider
    :theme="user.settings.theme"
    :theme-overrides="user.settings.theme ? naiveDark : naiveLight"
    inline-theme-disabled>
    <n-message-provider :keep-alive-on-hover="true" :max="5" placement="bottom">
      <n-flex class="main-view" vertical>
        <n-layout>
          <n-layout has-sider position="absolute">
            <n-layout-sider
              v-if="showMenu"
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
            <n-layout-content :native-scrollbar="false">
              <router-view #default="{ Component }" class="router-view">
                <keep-alive :exclude="keepAliveBlacklist">
                  <component :is="Component" />
                </keep-alive>
              </router-view>
            </n-layout-content>
          </n-layout>
        </n-layout>
        <n-layout-footer bordered class="footer-view">
          <n-flex align="center" justify="space-between">
            <n-flex align="center">
              <n-popover :show-arrow="false" placement="top" trigger="hover">
                <template #trigger>
                  <n-button round size="small" @click="toggleMenu">
                    <font-awesome-icon v-if="showMenu" :icon="['fas', 'expand']" />
                    <font-awesome-icon v-else :icon="['fas', 'compress']" />
                  </n-button>
                </template>
                <template #default>
                  <template v-if="showMenu">Masquer le menu</template>
                  <template v-else>Afficher le menu</template>
                </template>
              </n-popover>
              <n-switch v-model:value="themeSelector">
                <template #checked>
                  <font-awesome-icon :icon="['fas', 'moon']" />
                </template>
                <template #unchecked>
                  <font-awesome-icon :icon="['fas', 'sun']" />
                </template>
              </n-switch>
            </n-flex>
            <n-flex justify="end">
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
        </n-layout-footer>
      </n-flex>
    </n-message-provider>
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
  padding: .25em .5em
</style>
