<script setup>
import * as TablerIcons from "@tabler/icons-vue";
import { computed } from "vue";

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  size: {
    type: [String, Number],
    default: "1.25em",
  },
  stroke: {
    type: [String, Number],
    default: 2.5,
  },
  color: {
    type: String,
    default: "currentColor",
  },
  rotate: {
    type: Boolean,
    default: false,
  },
  pulse: {
    type: Boolean,
    default: false,
  },
  tada: {
    type: Boolean,
    default: false,
  },
});

const icon = computed(() => {
  const iconName =
    "Icon" +
    props.name
      .split("-")
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");

  return TablerIcons[iconName] || TablerIcons.IconPhotoQuestion;
});

const iconClasses = computed(() => {
  return {
    "icon-tada": props.tada,
    "icon-pulse": props.pulse,
    "icon-rotate": props.rotate,
  };
});
</script>

<template>
  <component
    :is="icon"
    v-if="icon"
    :class="iconClasses"
    :color="color"
    :size="size"
    :stroke="stroke" />
  <span v-else class="icon-not-found">?</span>
</template>

<style lang="sass" scoped>
.icon-not-found
  @apply flex
  @apply items-center
  @apply justify-center

  width: v-bind(size)
  height: v-bind(size)
  font-size: v-bind(size)
  overflow: hidden
</style>
