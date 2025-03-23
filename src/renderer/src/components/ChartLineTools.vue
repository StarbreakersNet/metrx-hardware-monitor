<script setup>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { computed, watch } from "vue";
import { useUserStore } from "@renderer/stores/user";
import _ from "lodash";
import { useThemeVars } from "naive-ui";

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
  return settings.charts.find(chart => chart.id === props.chartId);
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

    settings.charts.push(query);
  }
}

function resetThresholds() {
  settings.charts = settings.charts.filter(chart => chart.id !== props.chartId);
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
              @update:value="setThresholds({ newWarningThreshold: $event })">
              <template #suffix>%</template>
            </n-input-number>
          </n-flex>
          <n-flex>
            <span>Seuil de danger</span>
            <n-input-number
              :loading="!thresholdDanger"
              :max="100"
              :min="thresholdWarning"
              :value="thresholdDanger"
              size="small"
              @update:value="setThresholds({ newDangerThreshold: $event })">
              <template #suffix>%</template>
            </n-input-number>
          </n-flex>
          <n-checkbox
            :checked="showThresholds"
            @update:checked="setThresholds({ newShowThresholds: $event })">
            Afficher les seuils
          </n-checkbox>
        </n-flex>
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
      </n-flex>
    </template>
  </n-popover>
</template>

<style lang="sass" scoped>
.settings-content
  .n-input-number
    max-width: 10em
</style>
