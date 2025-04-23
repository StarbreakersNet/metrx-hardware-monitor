<script setup>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { formatValue } from "@renderer/appUtils";
import { useSystemStore } from "@renderer/stores/system";
import { useUserStore } from "@renderer/stores/user";
import { LineChart } from "echarts/charts";
import { GridComponent, TitleComponent, TooltipComponent } from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import VChart from "vue-echarts";
import ChartLineTools from "@renderer/components/Charts/ChartLineTools.vue";
import ChartLineStats from "@renderer/components/Charts/ChartLineStats.vue";
import _ from "lodash";
import ChartLineLastValue from "@renderer/components/Charts/ChartLineLastValue.vue";

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
const lastValuesCollection = computed(() => {
  const mainValue = _.find(props.data, { description: props.description })?.value ?? props.data;
  const values = [
    {
      description: props.description,
      value: mainValue,
      colorType: getValueColorType(mainValue),
    },
  ];

  if (props.mergedGraphs?.length > 0) {
    props.mergedGraphs.forEach(metric => {
      values.push({
        description: metric.description,
        value: metric.value,
        colorType: getValueColorType(metric.value),
      });
    });
  }

  return values;
});

function getValueColorType(value) {
  if (chartTools.value) {
    let { warning, danger } = chartTools.value.thresholds;

    if (value >= warning && value < danger) {
      return "warning";
    } else if (value > danger) {
      return "error";
    } else {
      return "primary";
    }
  }
  return "default";
}

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
      <n-flex :size="5" justify="end">
        <chart-line-stats
          :animation-duration="numberAnimationDuration"
          :chart-id="chartId"
          :edit-mode="editMode"
          :last-value-collection="lastValuesCollection"
          :precision="labelPrecision"
          :unit="props.unit" />
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
          <chart-line-last-value
            :animation-duration="numberAnimationDuration"
            :edit-mode="editMode"
            :icon="props.icon"
            :last-value-collection="lastValuesCollection"
            :precision="labelPrecision"
            :unit="props.unit" />
        </n-flex>
        <template v-if="!user.settings.showChartTitle">
          <n-flex :size="5" justify="end">
            <chart-line-stats
              :animation-duration="numberAnimationDuration"
              :chart-id="chartId"
              :edit-mode="editMode"
              :last-value-collection="lastValuesCollection"
              :precision="labelPrecision"
              :unit="props.unit" />
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
