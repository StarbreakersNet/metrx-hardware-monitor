<script setup>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { formatValue, getValueUnit } from "@renderer/appUtils";
import { useSystemStore } from "@renderer/stores/system";
import { useUserStore } from "@renderer/stores/user";
import { LineChart } from "echarts/charts";
import { GridComponent, TitleComponent, TooltipComponent } from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import VChart from "vue-echarts";
import ChartLineTools from "@renderer/components/ChartLineTools.vue";
import ChartLineStats from "@renderer/components/ChartLineStats.vue";
import AppSkeletonInput from "@renderer/components/AppSkeletonInput.vue";
import _ from "lodash";

use([TitleComponent, TooltipComponent, GridComponent, LineChart, CanvasRenderer]);

const system = useSystemStore();
const user = useUserStore();
const props = defineProps({
  data: {
    type: [Number, Array],
    default: null,
  },
  mergedGraphs: {
    type: Array,
    default: null,
  },
  title: {
    type: String,
    default: "Dynamic Data & Time Axis",
  },
  description: {
    type: [String, Array],
    default: null,
  },
  icon: {
    type: [String, Array],
    default: null,
  },
  min: {
    type: [Number, Array],
    default: null,
  },
  max: {
    type: [Number, Array],
    default: null,
  },
  unit: {
    type: String,
  },
  bufferSize: {
    type: Number,
    default: 10,
  },
  editMode: {
    type: Boolean,
    default: false,
  },
});
const emit = defineEmits(["editOrders"]);

const chartRef = ref(null);
const chartTools = ref(null);

const chartId = computed(() => {
  if (props.description == null) {
    return props.title.toLowerCase();
  } else if (props.title) {
    return props.title.toLowerCase() + "#" + props.description.toLowerCase();
  } else {
    return "#undefined#";
  }
});
const chartConfigValues = computed(() => {
  const chartConfig = user.settings.chartsSettings.find(chart => chart.id === chartId.value);
  return chartConfig ?? user.settings.chartsDefault;
});
const chartData = ref({});
watch(
  () => [props.description, _.map(props.mergedGraphs, "description")],
  () => {
    const newChartData = {
      [props.description]: chartData.value[props.description] || [],
    };

    if (props.mergedGraphs) {
      props.mergedGraphs.forEach(metric => {
        newChartData[metric.description] = chartData.value[metric.description] || [];
      });
    }

    chartData.value = newChartData;
  },
  {
    immediate: true,
  }
);
const markLineData = ref([]);
const valueColorType = computed(() => {
  if (chartTools.value) {
    let { warning, danger } = chartTools.value?.thresholds;

    if (lastValue.value >= warning && lastValue.value < danger) {
      return "warning";
    } else if (lastValue.value >= danger) {
      return "error";
    } else {
      return "primary";
    }
  }
});
const seriesMinValue = reactive({
  previous: formatValue({ value: props.max, unit: props.unit }),
  value: formatValue({ value: props.max, unit: props.unit }),
});
const seriesMaxValue = reactive({
  previous: formatValue({ value: props.min, unit: props.unit }),
  value: formatValue({ value: props.min, unit: props.unit }),
});
const seriesAverageValue = reactive({
  previous: formatValue({ value: props.data, unit: props.unit }),
  value: formatValue({ value: props.data, unit: props.unit }),
});

const updateOptions = {
  notMerge: true,
  lazyUpdate: true,
  silent: true,
};
const serieDefaultOptions = {
  name: "#data_title",
  type: "line",
  showSymbol: false,
  data: [],
  markLine: {
    silent: true,
    symbol: "none",
    lineStyle: {
      type: "dashed",
      opacity: 0.25,
    },
    data: markLineData.value,
  },
  areaStyle: {
    opacity: 0.25,
  },
  lineStyle: {
    width: 2,
    join: "round",
  },
  smooth: true,
  smoothMonotone: "x",
  connectNulls: false,
};
const seriesOptions = computed(() => {
  let options = [];

  options.push({
    ...serieDefaultOptions,
    name: props.description,
    data: chartData.value[props.description],
  });

  if (props.mergedGraphs?.length > 0) {
    _.forEach(props.mergedGraphs, metric => {
      options.push({
        ...serieDefaultOptions,
        name: metric.description,
        data: chartData.value[metric.description],
      });
    });
  }

  return options;
});
const option = ref({
  animation: false,
  tooltip: {
    trigger: "axis",
    axisPointer: {
      animation: false,
    },
    valueFormatter: value => {
      return formatValue({ value: value, unit: props.unit, showUnit: true });
    },
  },
  xAxis: {
    type: "time",
    min() {
      return new Date().getTime() - props.bufferSize * 60000;
    },
    max() {
      return new Date();
    },
    axisLabel: {
      hideOverlap: true,
      show: false,
    },
    axisLine: {
      show: true,
    },
    axisTick: {
      show: true,
    },
    splitLine: {
      show: false,
    },
  },
  yAxis: {
    type: "value",
    min: props.min,
    max: props.max,
    axisLabel: {
      show: true,
      formatter: value => {
        if (value === props.max) {
          return formatValue({ value: value, unit: props.unit, decimals: 0 });
        }
      },
      inside: true,
      showMaxLabel: true,
      showMinLabel: true,
    },
    axisLine: {
      show: true,
      hideOverlap: true,
    },
    minorTick: {
      show: true,
    },
    axisTick: {
      show: true,
      inside: true,
    },
    splitLine: {
      show: false,
    },
  },
  series: seriesOptions.value,
  grid: {
    top: "5%",
    right: 0,
    bottom: "5%",
    left: "left",
    containLabel: true,
  },
});

const showXLabel = computed(() => {
  return user.settings.showXLabel ?? false;
});
const showTools = ref(false);
const themeComputed = computed(() => {
  return user.settings.theme === "system" ? user.settings.osTheme : user.settings.theme;
});
const numberAnimationDuration = computed(() => {
  return user.settings.nodeFrequency / 2;
});
const lastValue = ref(null);
const lastValueFormated = computed(() => {
  return formatValue({
    value: lastValue.value,
    unit: props.unit,
  });
});
const previousValue = ref(null);
const previousValueFormated = computed(() => {
  if (previousValue.value != null) {
    return formatValue({ value: previousValue.value, unit: props.unit });
  } else {
    return lastValueFormated.value;
  }
});
const labelPrecision = computed(() => {
  switch (props.unit) {
    case "Mhz":
    case "°C":
    case "%":
      return 0;
    default:
      return 2;
  }
});

function updateSeriesData(newData) {
  if (chartRef.value) {
    let chartValues = chartData.value[props.description];

    if (Array.isArray(newData)) {
      console.log("seriesOptions", seriesOptions.value);
      newData.forEach(dataPoint => {
        chartData.value[dataPoint.description].push([new Date(), dataPoint.value]);

        const dataPointFormatted = formatValue({ value: dataPoint, unit: props.unit });
        if (dataPointFormatted < seriesMinValue.value || seriesMinValue.value == null) {
          seriesMinValue.previous = seriesMinValue.value;
          seriesMinValue.value = dataPointFormatted;
        }

        if (dataPointFormatted > seriesMaxValue.value || seriesMaxValue.value == null) {
          seriesMaxValue.previous = seriesMaxValue.value;
          seriesMaxValue.value = dataPointFormatted;
        }
      });
    } else {
      previousValue.value = lastValue.value;
      lastValue.value = newData;
      chartValues.push([new Date(), newData]);

      const newDataFormated = formatValue({ value: newData, unit: props.unit });
      if (newDataFormated < seriesMinValue.value || seriesMinValue.value == null) {
        seriesMinValue.previous = seriesMinValue.value;
        seriesMinValue.value = newDataFormated;
      }

      if (newDataFormated > seriesMaxValue.value || seriesMaxValue.value == null) {
        seriesMaxValue.previous = seriesMaxValue.value;
        seriesMaxValue.value = newDataFormated;
      }
    }

    if (chartValues.length > props.bufferSize * 60 + 1) {
      chartValues.splice(0, chartValues.length - props.bufferSize * 60 - 1);
    }

    const newAverageValue =
      chartValues.reduce((acc, curr) => acc + curr[1], 0) / chartValues.length || 0;
    seriesAverageValue.previous = seriesAverageValue.value;
    seriesAverageValue.value = formatValue({ value: newAverageValue, unit: props.unit });
  }
}

function initUpdateInterval() {
  if (updateIntervalId) {
    clearInterval(updateIntervalId);
  }
  updateIntervalId = setInterval(() => {
    updateSeriesData(props.data);
  }, user.settings.nodeFrequency);
}

watch(
  () => showXLabel.value,
  newValue => {
    option.value.xAxis.axisLabel.show = newValue;
    option.value.grid.bottom = newValue ? 0 : "5%";
  }
);

watch(
  () => user.settings.nodeFrequency,
  () => {
    initUpdateInterval();
  }
);

let updateIntervalId = null;

onMounted(() => {
  initUpdateInterval();
});

onUnmounted(() => {
  if (updateIntervalId) {
    clearInterval(updateIntervalId);
  }
});
</script>

<template>
  <n-card
    :key="'#' + chartId"
    :class="{
      'edit-mode': editMode,
    }"
    class="chart-card"
    size="small"
    @mouseenter="showTools = true"
    @mouseleave="showTools = false">
    <template v-if="user.settings.showChartTitle" #header>
      <n-space :wrap="false">
        <font-awesome-icon :icon="['fas', props.icon]" />
        <n-ellipsis :line-clamp="1">
          <template #default>
            <n-text>{{ props.title }}</n-text>
          </template>
          <template #tooltip>
            {{ props.title }}
          </template>
        </n-ellipsis>
      </n-space>
    </template>
    <template #header-extra>
      <n-flex :size="5">
        <chart-line-stats
          :animation-duration="numberAnimationDuration"
          :average-value="seriesAverageValue"
          :chart-id="chartId"
          :edit-mode="editMode"
          :max-value="seriesMaxValue"
          :min-value="seriesMinValue"
          :precision="labelPrecision" />
      </n-flex>
    </template>
    <template #default>
      <div class="chart-wrapper">
        <transition name="scale">
          <v-chart
            v-show="chartConfigValues.showGraph"
            key="chart"
            ref="chartRef"
            :autoresize="{ throttle: 300 }"
            :class="{ 'with-title': user.settings.showChartTitle }"
            :option="option"
            :theme="themeComputed"
            :update-options="updateOptions"
            class="chart" />
        </transition>
        <transition name="fade-skeleton">
          <n-skeleton v-if="editMode" :animated="false" :sharp="false" class="chart-skeleton" />
        </transition>
      </div>
    </template>
    <template v-if="props.description" #footer>
      <n-flex align="center" justify="space-between" size="large">
        <n-flex align="center">
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-tag type="warning" :bordered="false">
                <font-awesome-icon :icon="['fas', 'warning']" />
              </n-tag>
            </template>
            Besoin de mettre en composant le tag et envoyer un tableau (avec les mergedGraph comme dans le traitement) et avoir un tableau de lastValueFormated, donc appliquer les changements en tableau comme fait pour le tableau
          </n-tooltip>
          <n-tag :bordered="false" :type="valueColorType" round>
            <template v-if="props.icon" #avatar>
              <n-avatar
                :style="{
                  backgroundColor: 'transparent',
                  color: 'var(--n-color-text-default)',
                }">
                <font-awesome-icon
                  v-if="!user.settings.showChartTitle"
                  :icon="['fas', props.icon]" />
                <font-awesome-icon v-else :icon="['fas', 'circle']" />
              </n-avatar>
            </template>
            <template #default>
              <n-flex size="small">
                {{ props.description }} :
                <app-skeleton-input :show="editMode" round>
                  <div>
                    <n-number-animation
                      :duration="numberAnimationDuration"
                      :from="previousValueFormated"
                      :precision="labelPrecision"
                      :to="lastValueFormated" />
                    {{ getValueUnit(lastValue, props.unit) }}
                  </div>
                </app-skeleton-input>
              </n-flex>
            </template>
          </n-tag>
        </n-flex>
        <template v-if="!user.settings.showChartTitle">
          <n-flex :size="5">
            <chart-line-stats
              :animation-duration="numberAnimationDuration"
              :average-value="seriesAverageValue"
              :chart-id="chartId"
              :edit-mode="editMode"
              :max-value="seriesMaxValue"
              :min-value="seriesMinValue"
              :precision="labelPrecision" />
          </n-flex>
        </template>
      </n-flex>
      <transition name="scale">
        <n-flex v-show="showTools && !editMode" class="card-tools" justify="flex-end">
          <n-popover :show-arrow="false">
            <template #trigger>
              <n-button size="small" text @click="emit('editOrders')">
                <font-awesome-icon :icon="['fas', 'edit']" />
              </n-button>
            </template>
            <template #default>Organiser les graphiques</template>
          </n-popover>
          <chart-line-tools
            ref="chartTools"
            v-model:mark-line-data="markLineData"
            :chart-id="chartId"
            :max="props.max" />
        </n-flex>
      </transition>
    </template>
  </n-card>
</template>

<style lang="sass" scoped>
.chart-wrapper
  position: relative

  .chart
    position: relative
    min-height: 10em

    &.with-title
      min-height: 8em

  .chart-skeleton
    position: absolute
    top: 0
    left: 0
    right: 0
    bottom: 0
    height: 100%
    background-color: hsl(240, 4%, 21%)

.chart-card
  min-width: 12em

  &.edit-mode
    cursor: grab

  .chart-title-extra
    white-space: nowrap

  ::v-deep()
    .n-card-header
      column-gap: 1em

      .n-card-header__main
        display: flex
        flex-flow: column

        > *
          line-height: 1.2em

    h1, h2, h3, h4, h5, h6
      margin: unset

.card-tools
  position: absolute
  right: 0
  left: 0
  bottom: 0
  padding: .5em
</style>
