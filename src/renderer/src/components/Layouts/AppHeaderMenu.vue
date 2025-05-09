<script lang="ts" setup>
import { useUserStore } from "@renderer/stores/user";
import AppIcon from "@renderer/components/Utils/AppIcon.vue";

const { settings } = useUserStore();

function minimize() {
  window.electron.window.minimize();
}

function toggleMaximize() {
  window.electron.window.maximize();
}

function close() {
  window.electron.window.close();
}

// TODO Resume: Conditionner l'apparition du header-controls pour windows et linux. Pour le cas de linux regarder comment récupérer l'information de si il faut afficher à gauche ou à droite et ainsi faire varier l'ordre flex du group
</script>

<template>
  <n-layout-header
    :bordered="settings.showSideMenu"
    :class="{ 'with-background': settings.showSideMenu }"
    class="header-view">
    <n-flex class="tw:h-full">
      <div class="header-content tw:h-full tw:grow tw:py-1" />
      <n-flex class="header-controls-right tw:h-full" justify="end">
        <n-button-group>
          <n-button quaternary @click="minimize()">
            <app-icon name="minus" />
          </n-button>
          <n-button quaternary @click="toggleMaximize()">
            <app-icon name="square" size="1em" />
          </n-button>
          <n-button quaternary @click="close()">
            <app-icon name="x" />
          </n-button>
        </n-button-group>
      </n-flex>
    </n-flex>
  </n-layout-header>
</template>

<style lang="sass" scoped>
.header-view
  height: env(titlebar-area-height)
  user-select: none
  padding-left: max(1em, env(titlebar-area-x, 0px))
  padding-right: calc(env(titlebar-area-x, 0px) - env(titlebar-area-width, 0px))

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
