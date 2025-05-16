<script setup>
import AppIcon from "@renderer/components/Utils/AppIcon.vue";
import { useUserStore } from "@renderer/stores/user";
import { computed, onMounted, ref } from "vue";

const { settings } = useUserStore();
const gnomeButtonPosition = ref(null);

onMounted(async () => {
  if (window.electron.process.platform === "linux") {
    try {
      gnomeButtonPosition.value = await window.electron.gnome.getButtonPosition();
    } catch (error) {
      console.error("Impossible de récupérer la position des boutons GNOME:", error);
    }
  }
});

const windowControls = computed(() => {
  const platform = window.electron.process.platform;

  return {
    show: platform === "win32" || platform === "linux",
    position: getWindowControlsPosition(platform),
  };
});

function getWindowControlsPosition(platform) {
  switch (platform) {
    case "linux":
      // Utiliser la valeur GNOME détectée, ou position par défaut si non disponible
      return gnomeButtonPosition.value || "right";
    case "win32":
    default:
      return "right";
  }
}

function minimize() {
  window.electron.window.minimize();
}

function toggleMaximize() {
  window.electron.window.maximize();
}

function close() {
  window.electron.window.close();
}
</script>

<template>
  <n-layout-header
    :bordered="settings.showSideMenu"
    :class="{ 'with-background': settings.showSideMenu }"
    class="header-view">
    <n-flex
      :class="{ 'tw:!flex-row-reverse': windowControls.position === 'left' }"
      class="tw:h-full">
      <div class="header-content tw:h-full tw:grow tw:py-1 tw:px-4" />
      <n-flex v-if="windowControls.show" class="header-controls-right tw:h-full" justify="end">
        <n-button-group :class="{ 'tw:!flex-row-reverse': windowControls.position === 'left' }">
          <n-button :focusable="false" quaternary @click="minimize()">
            <template #icon>
              <app-icon name="minus" />
            </template>
          </n-button>
          <n-button :focusable="false" quaternary @click="toggleMaximize()">
            <template #icon>
              <app-icon name="square" size=".75em" />
            </template>
          </n-button>
          <n-button :focusable="false" quaternary @click="close()">
            <template #icon>
              <app-icon name="x" />
            </template>
          </n-button>
        </n-button-group>
      </n-flex>
    </n-flex>
  </n-layout-header>
</template>

<style lang="sass" scoped>
.header-view
  height: 30px
  user-select: none
  padding-left: env(titlebar-area-x, 0px)

  .header-content
    app-region: drag

  .header-controls-right
    :deep(.n-button)
      @apply h-full
      height: 100% !important

  &:not(.with-background)
    background: transparent

  > div
    > div
      font-size: .75em
</style>
