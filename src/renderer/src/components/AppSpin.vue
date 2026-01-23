<script setup>
import LoaderSpinner from "@renderer/components/LoaderSpinner.vue";

const props = defineProps({
  contentClasser: {
    type: String,
    default: undefined,
  },
  contentStyle: {
    type: [String, Object],
    default: undefined,
  },
  description: {
    type: String,
    default: undefined,
  },
  rotate: {
    type: Boolean,
    default: false,
  },
  size: {
    type: [String, Number],
    default: "medium",
  },
  show: {
    type: Boolean,
    default: true,
  },
  strokeWidth: {
    type: Number,
    default: undefined,
  },
  stroke: {
    type: String,
    default: undefined,
  },
  delay: {
    type: Number,
    default: undefined,
  },
});
</script>

<template>
  <n-spin
    :content-classer="contentClasser"
    :content-style="contentStyle"
    :delay="delay"
    :description="description"
    :rotate="rotate"
    :show="show"
    :size="size"
    :stroke="stroke"
    :stroke-width="strokeWidth">
    <template #default>
      <slot name="default" />
    </template>
    <template #description>
      <slot name="description" />
    </template>
    <template #icon>
      <slot name="icon">
        <loader-spinner />
      </slot>
    </template>
  </n-spin>
</template>

<style lang="sass" scoped></style>
