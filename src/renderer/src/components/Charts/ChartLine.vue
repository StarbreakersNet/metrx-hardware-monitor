<script setup>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { useUserStore } from "@renderer/stores/user";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import ChartLineTools from "@renderer/components/Charts/ChartLineTools.vue";
import ChartLineStats from "@renderer/components/Charts/ChartLineStats.vue";
import ChartLineLastValue from "@renderer/components/Charts/ChartLineLastValue.vue";
import { Line } from "vue-chartjs";
import {
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  TimeScale,
  Title,
  Tooltip,
} from "chart.js";
import "chartjs-adapter-date-fns";
import { formatValue, withOpacity } from "@renderer/appUtils";
import { registerTooltipCustoms } from "@renderer/components/Charts/ChartJsCustoms";
import { useChartTheme } from "@renderer/composables/chartJsThemeBuilder";
import Annotation from "chartjs-plugin-annotation";

registerTooltipCustoms();
ChartJS.register(
  Title,
  Tooltip,
  LineElement,
  PointElement,
  TimeScale,
  LinearScale,
  Annotation,
  Filler
);

const chartTheme = useChartTheme();
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
    return props.title.toLowerCase() + "#" + props.description?.toLowerCase();
  } else {
    return "#undefined#";
  }
});

const chartConfigValues = computed(() => {
  const chartConfig = user.settings.chartsSettings.find(chart => chart.id === chartId.value);
  return chartConfig ?? user.settings.chartsDefault;
});
// Utiliser une structure de données non-réactive pour stocker les points
const rawChartData = {
  [props.description]: [],
};
// Initialiser les données pour les graphiques fusionnés
if (props.mergedGraphs) {
  props.mergedGraphs.forEach(metric => {
    rawChartData[metric.description] = [];
  });
}
// Préparation des structures de données du graphique
const lineChartData = ref({
  datasets: [],
});
const thresholdsData = ref([]);

const lineChartOptions = ref({
  scales: {
    x: {
      type: "time",
      time: {
        unit: "minute",
        displayFormats: {
          minute: "HH:mm",
        },
      },
      min: new Date(new Date().getTime() - props.bufferSize * 60 * 1000),
      max: new Date(),
      ticks: {
        display: computed(() => user.settings.showXLabel),
      },
      grid: {
        drawOnChartArea: false,
        drawTicks: true,
      },
    },
    y: {
      type: "linear",
      min: props.min,
      max: props.max,
      ticks: {
        callback(value) {
          return formatValue({
            unit: props.unit,
            value,
            precision: labelPrecision.value,
          });
        },
      },
      grid: {
        drawOnChartArea: true,
        drawTicks: true,
      },
    },
  },
  interaction: {
    intersect: false,
    mode: "index",
  },
  responsive: true,
  maintainAspectRatio: false,
  animations: {
    x: {
      duration: user.settings.nodeFrequency / 2,
    },
    y: {
      duration: 0,
    },
  },
  plugins: {
    tooltip: {
      enabled: true,
      position: "bottom",
      callbacks: {
        title(context) {
          if (context[0].label) {
            return new Date(context[0].parsed.x).toLocaleTimeString();
          } else {
            return "";
          }
        },
        label(context) {
          const label = context.dataset.label || "";
          const value = formatValue({
            unit: props.unit,
            value: context.parsed.y,
            precision: labelPrecision.value,
            showUnit: true,
          });
          return label + " " + value;
        },
      },
    },
    annotation: {
      annotations: computed(() => {
        const annotations = {};
        const lineWidth = 1;
        const borderDash = [5, 5];

        if (thresholdsData.value) {
          const { warning, danger } = thresholdsData.value;

          if (warning) {
            annotations.warningLine = {
              type: "line",
              yMin: warning,
              yMax: warning,
              borderColor: chartTheme.themeComputed.value.warningColor + "80",
              borderWidth: lineWidth,
              borderDash: borderDash,
            };
          }

          if (danger) {
            annotations.dangerLine = {
              type: "line",
              yMin: danger,
              yMax: danger,
              borderColor: chartTheme.themeComputed.value.errorColor + "80",
              borderWidth: lineWidth,
              borderDash: borderDash,
            };
          }
        }

        return annotations;
      }),
    },
    filler: {
      propagate: true,
    },
  },
});

function updateDatasets() {
  const datasets = [];
  const mainColor = user.settings.chartsColors[props.description] || chartTheme.getDatasetColor(0);
  const mainBackgroundColor =
    user.settings.chartsColors[props.description] || chartTheme.getDatasetColor(0);

  datasets.push({
    label: props.description,
    data: rawChartData[props.description], // Créer une copie pour éviter les références réactives
    borderColor: mainColor,
    backgroundColor: withOpacity(mainBackgroundColor, 0.25),
    tension: 0.5,
    pointRadius: 0,
    fill: "origin",
  });

  if (props.mergedGraphs) {
    props.mergedGraphs.forEach((metric, index) => {
      const mergedColor =
        user.settings.chartsColors[metric.description] || chartTheme.getDatasetColor(index + 1);
      const mergedBackgroundColor =
        user.settings.chartsColors[metric.description] || chartTheme.getDatasetColor(index + 1);

      datasets.push({
        label: metric.description,
        data: rawChartData[metric.description],
        borderColor: mergedColor,
        backgroundColor: withOpacity(mergedBackgroundColor, 0.25),
        tension: 0.5,
        pointRadius: 0,
        fill: "origin",
      });
    });
  }

  lineChartData.value = {
    datasets,
  };

  const now = new Date();
  lineChartOptions.value = {
    ...lineChartOptions.value,
    scales: {
      ...lineChartOptions.value.scales,
      x: {
        ...lineChartOptions.value.scales.x,
        min: new Date(now.getTime() - 10 * 60 * 1000),
        max: now,
      },
    },
  };
}

// Fonction pour ajouter des données aux séries
function updateSeriesData(newData) {
  const updateDate = new Date();
  const maxPoints = props.bufferSize * 60;

  function updateDataset(description, value) {
    if (rawChartData[description]) {
      rawChartData[description].push({ x: updateDate, y: value });

      if (rawChartData[description].length > maxPoints) {
        rawChartData[description].shift();
      }
    }
  }

  if (Array.isArray(newData)) {
    newData.forEach(dataPoint => {
      updateDataset(dataPoint.description, dataPoint.value);
    });
  } else {
    updateDataset(props.description, newData);
  }

  updateDatasets();
}

let updateIntervalId = null;

function initUpdateInterval() {
  if (updateIntervalId) {
    clearInterval(updateIntervalId);
  }

  updateIntervalId = setInterval(() => {
    updateSeriesData(props.data);
  }, user.settings.nodeFrequency);
}

watch(
  () => user.settings.nodeFrequency,
  () => {
    initUpdateInterval();
  }
);

const showTools = ref(false);
const numberAnimationDuration = computed(() => {
  return user.settings.nodeFrequency / 2;
});
const lastValuesCollection = computed(() => {
  const values = [];

  if (Array.isArray(props.data)) {
    props.data.forEach(metric => {
      values.push({
        description: metric.description,
        value: metric.value,
        colorType: getValueColorType(metric.value),
      });
    });
  } else {
    values.push({
      description: props.description,
      value: props.data,
      colorType: getValueColorType(props.data),
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

// Lifecycle hooks
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
          <Line
            ref="chartRef"
            :data="lineChartData"
            :options="lineChartOptions"
            style="height: 10em !important" />
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
            :chart-id="chartId"
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
            v-model:thresholds-data="thresholdsData"
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

  .chart-skeleton
    position: absolute
    top: 0
    left: 0
    right: 0
    bottom: 0
    height: 100%
    background-color: hsl(240, 4%, 21%)

.chart-card
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
  bottom: 0
  padding: .5em
</style>
