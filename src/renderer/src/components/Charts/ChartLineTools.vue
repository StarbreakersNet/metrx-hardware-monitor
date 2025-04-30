<script setup>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { computed, watch } from "vue";
import { useUserStore } from "@renderer/stores/user";
import _ from "lodash";
import { useThemeVars } from "naive-ui";
import chartLineToolsAvailable from "@renderer/models/chartLineToolsAvailable";

const props = defineProps({
  markLineData: {
    type: Object,
    required: true,
  },
  chartId: {
    type: String,
    required: true,
  },
  max: {
    type: Number,
    required: true,
  },
});

const { settings } = useUserStore();
const themeVars = useThemeVars();

const chartConfig = computed(() => {
  return settings.chartsSettings.find(chart => chart.id === props.chartId);
});
const chartConfigValues = computed(() => {
  return chartConfig.value ?? settings.chartsDefault;
});

const showThresholds = computed(() => {
  let value = chartConfig.value?.showThresholds;
  let defaultValue = settings.chartsDefault.showThresholds;
  return value ?? defaultValue;
});
const thresholdWarning = computed(() => {
  let value = chartConfig.value?.warningThreshold;
  let defaultValue = settings.chartsDefault.warningThreshold;
  return value ?? defaultValue;
});
const thresholdDanger = computed(() => {
  let value = chartConfig.value?.dangerThreshold;
  let defaultValue = settings.chartsDefault.dangerThreshold;
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
const canResetThresholds = computed(() => {
  return chartConfig.value != null;
});

function setThresholds({ newWarningThreshold, newDangerThreshold, newShowThresholds }) {
  let chartDefault = settings.chartsDefault;

  if (chartConfig.value) {
    if (newWarningThreshold != null) {
      chartConfig.value.warningThreshold = newWarningThreshold;
    }

    if (newDangerThreshold != null) {
      chartConfig.value.dangerThreshold = newDangerThreshold;
    }

    if (newShowThresholds != null) {
      chartConfig.value.showThresholds = newShowThresholds;
    }
  } else {
    let query = {
      ...chartDefault,
      id: props.chartId,
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

    settings.chartsSettings.push(query);
  }
}

function resetThresholds() {
  settings.chartsSettings = settings.chartsSettings.filter(chart => chart.id !== props.chartId);
  updateThresholdsOptions();
}

function updateThresholdsOptions() {
  const updateMarkLineOption = (thresholdType, thresholdValue, color) => {
    const optionName = "threshold" + thresholdType;
    let option = props.markLineData.find(mark => mark.name === optionName);

    if (option) {
      option.yAxis = thresholdValue;
    } else {
      props.markLineData.push({
        name: optionName,
        type: "average",
        yAxis: thresholdValue,
        lineStyle: { color },
      });
    }
  };

  if (showThresholds.value) {
    if (thresholds.value.warning) {
      updateMarkLineOption("Warning", thresholds.value.warning, themeVars.value.warningColor);
    }
    if (thresholds.value.danger) {
      updateMarkLineOption("Danger", thresholds.value.danger, themeVars.value.errorColor);
    }
  } else {
    _.remove(props.markLineData, mark =>
      ["thresholdWarning", "thresholdDanger"].includes(mark.name)
    );
  }
}

function udpateChartSettings(key, value) {
  if (chartConfig.value) {
    chartConfig.value[key] = value;
  } else {
    settings.chartsSettings.push({
      ...settings.chartsDefault,
      id: props.chartId,
    });

    chartConfig.value[key] = value;
  }
}

watch(
  [
    () => chartConfig.value?.showThresholds,
    () => chartConfig.value?.warningThreshold,
    () => chartConfig.value?.dangerThreshold,
  ],
  () => {
    updateThresholdsOptions();
  },
  { immediate: true }
);

defineExpose({
  thresholds,
});
</script>

<template>
  <n-popover :show-arrow="false" style="padding: 0" trigger="click">
    <template #trigger>
      <n-button size="small" text>
        <template #icon>
          <font-awesome-icon :icon="['fas', 'ellipsis']" />
        </template>
      </n-button>
    </template>
    <template #default>
      <n-card :bordered="false" size="small">
        <template #header>
          <n-flex align="center">
            <font-awesome-icon :icon="['fas', 'screwdriver-wrench']" />
            <n-text>Outils du graphique</n-text>
          </n-flex>
        </template>
        <template #header-extra>
          <n-popover placement="right" trigger="hover">
            <template #trigger>
              <n-button :disabled="!canResetThresholds" size="small" text @click="resetThresholds">
                <template #icon>
                  <font-awesome-icon :icon="['fas', 'undo-alt']" />
                </template>
              </n-button>
            </template>
            <template #default>Réinitialiser</template>
          </n-popover>
        </template>
        <template #default>
          <n-flex vertical>
            <template v-for="setting in chartLineToolsAvailable" :key="setting.label">
              <template v-if="setting.type === 'checkbox'">
                <n-checkbox
                  :checked="chartConfigValues[setting.storeKey]"
                  :label="setting.label"
                  @update:checked="udpateChartSettings(setting.storeKey, $event)" />
              </template>
            </template>
            <n-checkbox
              :checked="showThresholds"
              @update:checked="setThresholds({ newShowThresholds: $event })">
              Afficher les seuils
            </n-checkbox>
            <n-flex align="flex-end" vertical>
              <n-flex>
                <span>Seuil d'avertissement</span>
                <n-input-number
                  :disabled="!showThresholds"
                  :loading="!thresholdWarning"
                  :max="thresholdDanger"
                  :min="0"
                  :value="thresholdWarning"
                  size="small"
                  @update:value="setThresholds({ newWarningThreshold: $event })">
                  <template #suffix>%</template>
                </n-input-number>
              </n-flex>
              <n-flex>
                <span>Seuil de danger</span>
                <n-input-number
                  :disabled="!showThresholds"
                  :loading="!thresholdDanger"
                  :max="100"
                  :min="thresholdWarning"
                  :value="thresholdDanger"
                  size="small"
                  @update:value="setThresholds({ newDangerThreshold: $event })">
                  <template #suffix>%</template>
                </n-input-number>
              </n-flex>
            </n-flex>
          </n-flex>
        </template>
      </n-card>
    </template>
  </n-popover>
</template>

<style lang="sass" scoped>
.n-input-number
  max-width: 10em
</style>
