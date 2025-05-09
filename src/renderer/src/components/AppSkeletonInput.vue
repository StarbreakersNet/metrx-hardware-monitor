<script setup>
import { computed, ref, useSlots, watch } from "vue";

const DEFAULT_WIDTH = "2em";

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  round: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  repeat: {
    type: Number,
    default: 0,
  },
  width: {
    type: String,
    default: null,
  },
  sharp: {
    type: Boolean,
    default: false,
  },
});
const slots = useSlots();

const refSkeleton = ref(null);
const defaultSlotWidth = ref(DEFAULT_WIDTH);
const computedWidth = computed(() => props.width ?? defaultSlotWidth.value);

watch(
  () => props.show,
  async value => {
    if (value && slots.default) {
      defaultSlotWidth.value = `${refSkeleton.value?.getBoundingClientRect().width}px`;
    }
  },
  {
    immediate: true,
  }
);
</script>

<template>
  <div ref="refSkeleton" class="app-skeleton">
    <transition mode="out-in" name="fade-skeleton">
      <template v-if="show">
        <n-skeleton
          :animated="props.loading"
          :repeat="props.repeat"
          :round="props.round"
          :sharp="props.sharp"
          :width="computedWidth"
          text />
      </template>
      <template v-else>
        <slot name="default" />
      </template>
    </transition>
  </div>
</template>

<style lang="sass" scoped>
.app-skeleton
  position: relative
</style>
