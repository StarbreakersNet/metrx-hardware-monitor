<script setup>
import { computed, ref } from "vue";
import { useThemeVars } from "naive-ui";

const props = defineProps({
  particles: {
    type: Number,
    default: 50,
  },
  particleSize: {
    type: Number,
    default: 2,
  },
  radius: {
    type: Number,
    default: 30,
  },
  lapDuration: {
    type: String,
    default: "1s",
  },
  particleColor: {
    type: String,
  },
  sizeRatio: {
    type: Number,
    default: 1,
  },
  absolute: {
    type: Boolean,
    default: false,
  },
});

const themeVars = ref(useThemeVars());

const computedProps = computed(() => ({
  particles: props.particles * props.sizeRatio,
  particleSize: Math.log2(props.particleSize * (props.sizeRatio / 20) + 5) + "px",
  radius: props.radius * props.sizeRatio,
  lapDuration: props.lapDuration,
  particleColor: props.particleColor ?? themeVars.value?.primaryColor,
}));

// Generate styles for each particle
const particleStyles = computed(() => {
  const styles = [];
  for (let i = 1; i <= computedProps.value.particles; i++) {
    const angle = (i / computedProps.value.particles) * 360;
    const transform = `rotate(${angle}deg) translate3d(${computedProps.value.radius}px, 0, 0)`;
    const animationDelay = `calc(${i} * (${computedProps.value.lapDuration} / (${computedProps.value.particles} - 2)))`;
    styles.push({
      transform,
      b: {
        animationDelay,
      },
    });
  }
  return styles;
});

const cssVariables = computed(() => ({
  "--radius": `${computedProps.value.radius}px`,
  "--particle-size": computedProps.value.particleSize,
  "--lap-duration": computedProps.value.lapDuration,
  "--particle-color": computedProps.value.particleColor,
  "--translate-value": `calc(${computedProps.value.particleSize})`,
}));
</script>

<template>
  <div :style="cssVariables" class="spinner" :class="{ absolute: props.absolute }">
    <div class="spinner__title">
      <slot name="default" />
    </div>
    <template v-for="(style, index) in particleStyles" :key="index">
      <i :style="{ transform: style.transform }">
        <b :style="{ animationDelay: style.b.animationDelay }"></b>
      </i>
    </template>
  </div>
</template>

<style lang="sass" scoped>
.spinner__title
  position: absolute
  height: 100%
  width: 100%
  display: flex
  justify-content: center
  align-items: center
  color: var(--particle-color)
  font-size: 1.5em
  font-weight: bold
  text-transform: uppercase
  text-shadow: 0 0 1em var(--particle-color)

.spinner
  position: relative
  height: calc(var(--radius) * 2 + var(--particle-size) * 2)
  width: calc(var(--radius) * 2 + var(--particle-size) * 2)
  perspective: 200px

  &.absolute
    position: absolute
    top: 0
    left: 0
    height: 100%
    width: 100%
    display: flex
    justify-content: center
    align-items: center

i
  display: block
  position: absolute
  top: calc(50% - var(--particle-size) / 2)
  left: calc(50% - var(--particle-size) / 2)
  opacity: 1

  b
    display: block
    width: var(--particle-size)
    height: var(--particle-size)
    border-radius: var(--particle-size)
    background: var(--particle-color)
    box-shadow: 0 0 14px var(--particle-color)
    animation-name: spin
    animation-duration: var(--lap-duration)
    animation-iteration-count: infinite
    animation-timing-function: ease-in-out

@keyframes spin
  0%
    transform: scale(1)
  15%
    transform: translate(calc(-1 * var(--translate-value)), calc(-1 * var(--translate-value))) scale(3)
  50%
    transform: scale(1)
</style>
