<script setup>
const props = defineProps({
  color: {
    type: String,
    default: "var(--n-color)",
  },
  size: {
    type: String,
    default: "1em",
  },
});
</script>

<template>
  <n-layout-content :native-scrollbar="false" class="scroll-layout-container">
    <div class="scroll-layout-content">
      <slot name="default" />
    </div>
  </n-layout-content>
</template>

<style lang="sass" scoped>
.scroll-layout-container
  --gradient-color: v-bind(props.color)
  --gradient-size: v-bind(props.size)

  background: var(--gradient-color)
  overflow: auto

  &:before,
  &:after
    z-index: 10
    content: ""
    position: absolute
    width: 100%
    backdrop-filter: blur(.5em)

  &:before
    top: 0
    height: var(--gradient-size)
    background: linear-gradient(to top, transparent 0%, var(--gradient-color) 100%)
    mask: linear-gradient(to top, transparent 0%, var(--gradient-color) 75%)

  &:after
    bottom: 0
    height: calc(var(--gradient-size) * 2)
    background: linear-gradient(to bottom, transparent 0%, var(--gradient-color) 100%)
    mask: linear-gradient(to bottom, transparent 0%, var(--gradient-color) 75%)

  .scroll-layout-content
    padding: var(--gradient-size) 0 calc(var(--gradient-size) * 2) 0
    overflow: auto
</style>
