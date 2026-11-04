<script setup>
import { currentPlatform } from "@/api/app";
import { close, getGnomeButtonPosition, minimize, toggleMaximize } from "@/api/window";
import AppIcon from "@/components/Utils/AppIcon.vue";
import { useUserStore } from "@/stores/user";
import { computed, onMounted, ref } from "vue";

const { settings } = useUserStore();
const gnomeButtonPosition = ref(null);

onMounted(async () => {
  if (currentPlatform === "linux") {
    try {
      gnomeButtonPosition.value = await getGnomeButtonPosition();
    } catch (error) {
      console.error("Impossible de récupérer la position des boutons GNOME:", error);
    }
  }
});

const windowControls = computed(() => {
  return {
    show: currentPlatform === "windows" || currentPlatform === "linux",
    position: getWindowControlsPosition(currentPlatform),
  };
});

function getWindowControlsPosition(platform) {
  switch (platform) {
    case "linux":
      // Utiliser la valeur GNOME détectée, ou position par défaut si non disponible
      return gnomeButtonPosition.value || "right";
    case "windows":
    default:
      return "right";
  }
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
      <div class="header-content tw:h-full tw:grow tw:py-1 tw:px-4" data-tauri-drag-region />
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

  .header-controls-right
    :deep(.n-button)
      height: 100% !important

  &:not(.with-background)
    background: transparent

  > div
    > div
      font-size: .75em
</style>
