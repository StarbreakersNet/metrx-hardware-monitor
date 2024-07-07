<script setup>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { formatValue, getValueUnit } from "@renderer/appUtils";
import { useSystemStore } from "@renderer/stores/system";
import { useUserStore } from "@renderer/stores/user";
import { LineChart } from "echarts/charts";
import { GridComponent, TitleComponent, TooltipComponent } from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { computed, reactive, ref, watch } from "vue";
import VChart from "vue-echarts";
import { useThemeVars } from "naive-ui";
import _ from "lodash";

use([TitleComponent, TooltipComponent, GridComponent, LineChart, CanvasRenderer]);

const system = useSystemStore();
const user = useUserStore();
const theme = useThemeVars();
const props = defineProps({
  data: {
    type: [Number, Array],
    default: null,
  },
  title: {
    type: String,
    default: "Dynamic Data & Time Axis",
  },
  description: {
    type: String,
    default: null,
  },
  icon: {
    type: String,
    default: null,
  },
  min: {
    type: Number,
    default: null,
  },
  max: {
    type: Number,
    default: null,
  },
  unit: {
    type: String,
  },
  bufferSize: {
    type: Number,
    default: 10,
  },
});

const chartId = computed(() => {
  if (props.description == null) {
    return props.title.toLowerCase();
  } else if (props.title) {
    return props.title.toLowerCase() + "#" + props.description.toLowerCase();
  } else {
    return "#undefined#";
  }
});
const seriesData = ref([]);
const markLineData = ref([]);

const thresholdWarning = computed(() => {
  let value = user.settings.charts.find(chart => chart.id === chartId.value)?.warningThreshold;
  let defaultValue = user.settings.chartsDefault.warningThreshold;
  return value ?? defaultValue;
});
const thresholdDanger = computed(() => {
  let value = user.settings.charts.find(chart => chart.id === chartId.value)?.dangerThreshold;
  let defaultValue = user.settings.chartsDefault.dangerThreshold;
  return value ?? defaultValue;
});
const showThresholds = computed(() => {
  let value = user.settings.charts.find(chart => chart.id === chartId.value)?.showThresholds;
  let defaultValue = user.settings.chartsDefault.showThresholds;
  return value ?? defaultValue;
});
const thresholds = computed(() => {
  let warningThreshold = thresholdWarning.value / 100;
  let dangerThreshold = thresholdDanger.value / 100;

  return {
    warning: props.max * warningThreshold,
    danger: props.max * dangerThreshold,
  };
});
const valueColorType = computed(() => {
  if (
    lastValueFormated.value >= thresholds.value.warning &&
    lastValueFormated.value < thresholds.value.danger
  ) {
    return "warning";
  } else if (lastValueFormated.value >= thresholds.value.danger) {
    return "error";
  } else {
    return "primary";
  }
});

function setThresholds({ newWarningThreshold, newDangerThreshold, newShowThresholds }) {
  let chartConfig = user.settings.charts.find(chart => chart.id === chartId.value);
  let chartDefault = user.settings.chartsDefault;

  if (chartConfig) {
    if (newWarningThreshold != null) {
      chartConfig.warningThreshold = newWarningThreshold;
    }

    if (newDangerThreshold != null) {
      chartConfig.dangerThreshold = newDangerThreshold;
    }

    if (newShowThresholds != null) {
      chartConfig.showThresholds = newShowThresholds;
    }
  } else {
    let query = {
      ...chartDefault,
      id: chartId.value,
    };

    if (newWarningThreshold != null) {
      query.warningThreshold = newWarningThreshold;
    }

    if (newDangerThreshold != null) {
      query.dangerThreshold = newDangerThreshold;
    }

    if (newShowThresholds != null) {
      query.showThresholds = newShowThresholds;
    }

    user.settings.charts.push(query);
  }
}

function updateThresholdsOptions() {
  const updateMarkLineOption = (thresholdType, thresholdValue, color) => {
    const optionName = "threshold" + thresholdType;
    let option = markLineData.value.find(mark => mark.name === optionName);

    if (option) {
      option.yAxis = thresholdValue;
    } else {
      markLineData.value.push({
        name: optionName,
        type: "average",
        yAxis: thresholdValue,
        lineStyle: { color },
      });
    }
  };

  if (showThresholds.value) {
    if (thresholds.value.warning) {
      updateMarkLineOption("Warning", thresholds.value.warning, theme.value.warningColor);
    }
    if (thresholds.value.danger) {
      updateMarkLineOption("Danger", thresholds.value.danger, theme.value.errorColor);
    }
  } else {
    _.remove(markLineData.value, mark =>
      ["thresholdWarning", "thresholdDanger"].includes(mark.name)
    );
  }
}

const canResetThresholds = computed(() => {
  return user.settings.charts.find(chart => chart.id === chartId.value) != null;
});

function resetThresholds() {
  user.settings.charts = user.settings.charts.filter(chart => chart.id !== chartId.value);
  updateThresholdsOptions();
}

const seriesMinValue = reactive({
  previous: props.max,
  value: props.max,
});
const seriesMaxValue = reactive({
  previous: props.min,
  value: props.min,
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
  series: [
    {
      name: props.description,
      type: "line",
      showSymbol: false,
      data: seriesData.value,
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
    },
  ],
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
const lastValueFormated = computed(() => {
  return formatValue({
    value: seriesData.value[seriesData.value.length - 1]?.value[1],
    unit: props.unit,
  });
});
const previousValueFormated = computed(() => {
  let previousValue = seriesData.value[seriesData.value.length - 2]?.value[1];

  if (previousValue != null) {
    return formatValue({ value: previousValue, unit: props.unit });
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

watch(
  // Permet de mettre à jour le graphique en temps réel du store quelque soit la valeur
  () => system.metrics,
  () => {
    let bufferTime = new Date().getTime() - props.bufferSize * 60000;

    seriesData.value.push({
      name: props.data,
      value: [new Date(), props.data],
    });

    if (seriesData.value[0].value[0] <= bufferTime) {
      seriesData.value.shift();
    }

    if (props.data < seriesMinValue.value || seriesMinValue.value == null) {
      seriesMinValue.previous = seriesMinValue.value;
      seriesMinValue.value = formatValue({ value: props.data, unit: props.unit });
    }

    if (props.data > seriesMaxValue.value || seriesMaxValue.value == null) {
      seriesMaxValue.previous = seriesMaxValue.value;
      seriesMaxValue.value = formatValue({ value: props.data, unit: props.unit });
    }
  },
  { immediate: true }
);
watch(
  () => showXLabel.value,
  newValue => {
    option.value.xAxis.axisLabel.show = newValue;
    option.value.grid.bottom = newValue ? 0 : "5%";
  }
);
watch(
  () => user.settings.charts.find(chart => chart.id === chartId.value),
  () => {
    updateThresholdsOptions();
  },
  { deep: true, immediate: true }
);
</script>

<template>
  <n-card
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
        <n-tag :bordered="false" round type="info">
          <n-flex size="small">
            <font-awesome-icon :icon="['fas', 'arrow-down']" />
            <n-number-animation
              :duration="numberAnimationDuration"
              :from="seriesMinValue.previous"
              :precision="labelPrecision"
              :to="seriesMinValue.value" />
          </n-flex>
        </n-tag>
        <n-tag :bordered="false" round type="warning">
          <n-flex size="small">
            <font-awesome-icon :icon="['fas', 'arrow-up']" />
            <n-number-animation
              :duration="numberAnimationDuration"
              :from="seriesMaxValue.previous"
              :precision="labelPrecision"
              :to="seriesMaxValue.value" />
          </n-flex>
        </n-tag>
      </n-flex>
    </template>
    <template #default>
      <v-chart
        :autoresize="{ throttle: 10 }"
        :class="{ 'with-title': user.settings.showChartTitle }"
        :option="option"
        :theme="themeComputed"
        class="chart" />
    </template>
    <template v-if="props.description" #footer>
      <n-flex align="center" size="large">
        <n-tag :bordered="false" :type="valueColorType" round>
          <template v-if="props.icon" #avatar>
            <n-avatar
              :style="{
                backgroundColor: 'transparent',
                color: 'var(--n-color-text-default)',
              }">
              <font-awesome-icon v-if="!user.settings.showChartTitle" :icon="['fas', props.icon]" />
              <font-awesome-icon v-else :icon="['fas', 'circle']" />
            </n-avatar>
          </template>
          <template #default>
            {{ props.description }} :
            <n-number-animation
              :duration="numberAnimationDuration"
              :from="previousValueFormated"
              :precision="labelPrecision"
              :to="lastValueFormated" />
            {{ getValueUnit(seriesData[seriesData?.length - 1]?.value[1], props.unit) }}
          </template>
        </n-tag>
        <template v-if="!user.settings.showChartTitle">
          <n-flex :size="5">
            <n-tag :bordered="false" round type="info">
              <n-flex size="small">
                <font-awesome-icon :icon="['fas', 'arrow-down']" />
                <n-number-animation
                  :duration="numberAnimationDuration"
                  :from="seriesMinValue.previous"
                  :precision="labelPrecision"
                  :to="seriesMinValue.value" />
              </n-flex>
            </n-tag>
            <n-tag :bordered="false" round type="warning">
              <n-flex size="small">
                <font-awesome-icon :icon="['fas', 'arrow-up']" />
                <n-number-animation
                  :duration="numberAnimationDuration"
                  :from="seriesMaxValue.previous"
                  :precision="labelPrecision"
                  :to="seriesMaxValue.value" />
              </n-flex>
            </n-tag>
          </n-flex>
        </template>
      </n-flex>
      <transition name="scale">
        <n-flex v-show="showTools" class="card-tools" justify="flex-end">
          <n-popover :show-arrow="false" trigger="click">
            <template #trigger>
              <n-button size="small" text>
                <template #icon>
                  <font-awesome-icon :icon="['fas', 'ellipsis']" />
                </template>
              </n-button>
            </template>
            <template #default>
              <n-flex align="center" class="settings-content">
                <n-flex align="flex-end" vertical>
                  <n-flex>
                    <span>Seuil d'avertissement</span>
                    <n-input-number
                      :loading="!thresholdWarning"
                      :max="thresholdDanger"
                      :min="0"
                      :value="thresholdWarning"
                      size="small"
                      @update:value="setThresholds({ newWarningThreshold: $event })" />
                  </n-flex>
                  <n-flex>
                    <span>Seuil de danger</span>
                    <n-input-number
                      :loading="!thresholdDanger"
                      :max="100"
                      :min="thresholdWarning"
                      :value="thresholdDanger"
                      size="small"
                      @update:value="setThresholds({ newDangerThreshold: $event })" />
                  </n-flex>
                  <n-checkbox
                    :checked="showThresholds"
                    @update:checked="setThresholds({ newShowThresholds: $event })">
                    Afficher les seuils
                  </n-checkbox>
                </n-flex>
                <n-popover placement="right" trigger="hover">
                  <template #trigger>
                    <n-button
                      :disabled="!canResetThresholds"
                      size="small"
                      text
                      @click="resetThresholds">
                      <template #icon>
                        <font-awesome-icon :icon="['fas', 'undo-alt']" />
                      </template>
                    </n-button>
                  </template>
                  <template #default>Réinitialiser</template>
                </n-popover>
              </n-flex>
            </template>
          </n-popover>
        </n-flex>
      </transition>
    </template>
  </n-card>
</template>

<style lang="sass" scoped>
.chart
  min-height: 10em

  &.with-title
    min-height: 8em

.chart-card
  min-width: 12em

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

.settings-content
  .n-input-number
    max-width: 10em
</style>
