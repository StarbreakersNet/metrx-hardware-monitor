<script setup>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { computed, ref, watch } from "vue";
import { useUserStore } from "@renderer/stores/user";
import AppSkeletonInput from "@renderer/components/AppSkeletonInput.vue";
import { formatValue } from "@renderer/appUtils";

const { settings } = useUserStore();

const props = defineProps({
  chartId: {
    type: String,
    required: true,
  },
  lastValueCollection: {
    type: Array,
    default: () => [{ value: 0, description: "undefined", colorType: "default" }],
  },
  unit: {
    type: String,
    default: undefined,
  },
  precision: {
    type: Number,
    default: 1,
  },
  animationDuration: {
    type: Number,
    default: 1000,
  },
  editMode: {
    type: Boolean,
    default: false,
  },
});

const chartConfigValues = computed(() => {
  const chartConfig = settings.chartsSettings.find(chart => chart.id === props.chartId);
  return chartConfig ?? settings.chartsDefault;
});

const seriesStats = ref({});

watch(
  () => props.lastValueCollection,
  newCollection => {
    newCollection.forEach(item => {
      if (!seriesStats.value[item.description]) {
        seriesStats.value[item.description] = {
          values: [],
          min: { value: item.value, previous: item.value },
          max: { value: item.value, previous: item.value },
          average: { value: item.value, previous: item.value },
        };
      }

      const stats = seriesStats.value[item.description];
      stats.values.push(item.value);

      // Limit the size of values array
      if (stats.values.length > 60) {
        stats.values.shift();
      }

      // Update min, max and average
      const newMin = Math.min(...stats.values);
      if (newMin !== stats.min.value) {
        stats.min.previous = stats.min.value;
        stats.min.value = newMin;
      }

      const newMax = Math.max(...stats.values);
      if (newMax !== stats.max.value) {
        stats.max.previous = stats.max.value;
        stats.max.value = newMax;
      }

      const newAverage = stats.values.reduce((sum, val) => sum + val, 0) / stats.values.length;
      stats.average.previous = stats.average.value;
      stats.average.value = newAverage;
    });
  },
  { immediate: true, deep: true }
);

const combinedStats = computed(() => {
  if (Object.keys(seriesStats.value).length === 0) {
    return {
      min: { value: 0, previous: 0 },
      max: { value: 0, previous: 0 },
      average: { value: 0, previous: 0 },
    };
  }

  const allSeries = Object.values(seriesStats.value);
  const minValues = allSeries.map(series =>
    formatValue({ value: series.min.value, unit: props.unit })
  );
  const maxValues = allSeries.map(series =>
    formatValue({ value: series.max.value, unit: props.unit })
  );
  const allValues = allSeries.flatMap(series => series.values);
  const averageValue =
    allValues.length > 0 ? allValues.reduce((sum, val) => sum + val, 0) / allValues.length : 0;

  return {
    min: {
      value: formatValue({ value: Math.min(...minValues), unit: props.unit }),
      previous: formatValue({
        value: Math.min(...allSeries.map(s => s.min.previous)),
        unit: props.unit,
      }),
    },
    max: {
      value: formatValue({ value: Math.max(...maxValues), unit: props.unit }),
      previous: formatValue({
        value: Math.max(...allSeries.map(s => s.max.previous)),
        unit: props.unit,
      }),
    },
    average: {
      value: formatValue({ value: averageValue, unit: props.unit }),
      previous: formatValue({ value: averageValue, unit: props.unit }),
    },
  };
});
</script>

<template>
  <transition-group name="insert">
    <n-tag
      v-if="chartConfigValues.showAverage"
      key="average"
      :bordered="false"
      round
      type="default">
      <app-skeleton-input :show="editMode" round>
        <n-flex size="small">
          <font-awesome-icon :icon="['fas', 'divide']" />
          <n-number-animation
            :duration="animationDuration"
            :from="combinedStats.average.previous"
            :precision="precision"
            :to="combinedStats.average.value" />
        </n-flex>
      </app-skeleton-input>
    </n-tag>
    <n-tag v-if="chartConfigValues.showMinMax" key="min" :bordered="false" round type="info">
      <app-skeleton-input :show="editMode" round>
        <n-flex size="small">
          <font-awesome-icon :icon="['fas', 'arrow-down']" />
          <n-number-animation
            :duration="animationDuration"
            :from="combinedStats.min.previous"
            :precision="precision"
            :to="combinedStats.min.value" />
        </n-flex>
      </app-skeleton-input>
    </n-tag>
    <n-tag v-if="chartConfigValues.showMinMax" key="max" :bordered="false" round type="warning">
      <app-skeleton-input :show="editMode" round>
        <n-flex size="small">
          <font-awesome-icon :icon="['fas', 'arrow-up']" />
          <n-number-animation
            :duration="animationDuration"
            :from="combinedStats.max.previous"
            :precision="precision"
            :to="combinedStats.max.value" />
        </n-flex>
      </app-skeleton-input>
    </n-tag>
  </transition-group>
</template>

<style lang="sass" scoped></style>
