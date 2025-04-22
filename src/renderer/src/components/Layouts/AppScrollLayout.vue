<script setup></script>

<template>
  <n-layout>
    <n-layout-content :native-scrollbar="false" class="scroll-layout-container">
      <div class="scroll-layout-content">
        <slot name="default" />
      </div>
    </n-layout-content>
  </n-layout>
</template>

<style lang="sass" scoped>
.scroll-layout-content
  padding: 2em
  overflow: auto

.scroll-layout-container
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
</style>
