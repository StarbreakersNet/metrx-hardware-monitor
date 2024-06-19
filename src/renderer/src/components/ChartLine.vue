<script setup>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { formatValue, getValueUnit } from "@renderer/appUtils";
import { useSystemStore } from "@renderer/stores/system";
import { useUserStore } from "@renderer/stores/user";
import { LineChart } from "echarts/charts";
import { GridComponent, TitleComponent, TooltipComponent } from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { computed, ref, watch } from "vue";
import VChart from "vue-echarts";

use([TitleComponent, TooltipComponent, GridComponent, LineChart, CanvasRenderer]);

const system = useSystemStore();
const user = useUserStore();
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

const seriesData = ref([]);
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
        return formatValue({ value: value, unit: props.unit, decimals: 0 });
      },
      interval: 1,
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
      areaStyle: {
        opacity: 0.8,
      },
      smooth: false,
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
const themeComputed = computed(() => {
  return user.settings.isDark ? "dark" : "light";
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
</script>

<template>
  <n-card class="chart-card" size="small">
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
    <template #default>
      <v-chart
        :autoresize="{ throttle: 10 }"
        :option="option"
        :theme="themeComputed"
        class="chart" />
    </template>
    <template v-if="props.description" #footer>
      <n-tag round type="primary">
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
            :duration="user.settings.nodeFrequency / 2"
            :from="lastValueFormated"
            :precision="labelPrecision"
            :to="previousValueFormated" />
          {{ getValueUnit(seriesData[seriesData?.length - 1]?.value[1], props.unit) }}
        </template>
      </n-tag>
    </template>
  </n-card>
</template>

<style lang="sass" scoped>
.chart
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
</style>
