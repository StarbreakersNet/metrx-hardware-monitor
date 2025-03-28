<script setup>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { computed } from "vue";
import { useUserStore } from "@renderer/stores/user";

const { settings } = useUserStore();

const props = defineProps({
  chartId: {
    type: String,
    required: true,
  },
  averageValue: {
    type: Object,
    default: () => ({ value: 0, previous: 0 }),
  },
  minValue: {
    type: Object,
    default: () => ({ value: 0, previous: 0 }),
  },
  maxValue: {
    type: Object,
    default: () => ({ value: 0, previous: 0 }),
  },
  precision: {
    type: Number,
    default: 1,
  },
  animationDuration: {
    type: Number,
    default: 1000,
  },
});

const chartConfigValues = computed(() => {
  const chartConfig = settings.charts.find(chart => chart.id === props.chartId);
  return chartConfig ?? settings.chartsDefault;
});
</script>

<template>
  <transition-group name="insert">
    <n-tag v-if="chartConfigValues.showAverage" key="average" :bordered="false" round type="info">
      <n-flex size="small">
        <font-awesome-icon :icon="['fas', 'divide']" />
        <n-number-animation
          :duration="animationDuration"
          :from="averageValue.previous"
          :precision="precision"
          :to="averageValue.value" />
      </n-flex>
    </n-tag>
    <n-tag v-if="chartConfigValues.showMinMax" key="min" :bordered="false" round type="info">
      <n-flex size="small">
        <font-awesome-icon :icon="['fas', 'arrow-down']" />
        <n-number-animation
          :duration="animationDuration"
          :from="minValue.previous"
          :precision="precision"
          :to="minValue.value" />
      </n-flex>
    </n-tag>
    <n-tag v-if="chartConfigValues.showMinMax" key="max" :bordered="false" round type="warning">
      <n-flex size="small">
        <font-awesome-icon :icon="['fas', 'arrow-up']" />
        <n-number-animation
          :duration="animationDuration"
          :from="maxValue.previous"
          :precision="precision"
          :to="maxValue.value" />
      </n-flex>
    </n-tag>
  </transition-group>
</template>

<style lang="sass" scoped></style>
