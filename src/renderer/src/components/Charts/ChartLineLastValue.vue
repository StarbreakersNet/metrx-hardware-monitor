<script setup>
import { formatValue, getValueUnit } from "@renderer/appUtils";
import AppSkeletonInput from "@renderer/components/AppSkeletonInput.vue";
import AppIcon from "@renderer/components/Utils/AppIcon.vue";
import { useUserStore } from "@renderer/stores/user";

import { computed, ref } from "vue";

const props = defineProps({
  lastValueCollection: {
    type: Array,
    default: () => [{ value: 0, description: "undefined", colorType: "default" }],
  },
  chartId: {
    type: String,
    default: null,
  },
  icon: {
    type: String,
    default: undefined,
  },
  unit: {
    type: String,
    default: undefined,
  },
  editMode: {
    type: Boolean,
    default: false,
  },
  animationDuration: {
    type: Number,
    default: 1000,
  },
  precision: {
    type: Number,
    default: 1,
  },
});

const { settings } = useUserStore();

const previousValues = ref({});

const animationValues = computed(() => {
  const result = {};
  props.lastValueCollection.forEach(item => {
    const prev = previousValues.value[item.description] || 0;
    result[item.description] = {
      from: prev,
      fromFormated: formatValue({
        value: prev,
        unit: props.unit,
      }),
      to: item.value,
      toFormated: formatValue({
        value: item.value,
        unit: props.unit,
      }),
    };
    previousValues.value[item.description] = item.value;
  });
  return result;
});

function getSerieColor(serie) {
  return settings.chartsColors[serie.description] ?? "var(--n-color-text-default)";
}

function onSerieColorChange(serie, color) {
  settings.chartsColors[serie.description] = color;
}

function onSerieColorRemove(serie) {
  delete settings.chartsColors[serie.description];
}
</script>

<template>
  <n-tag
    v-for="lastValue in lastValueCollection"
    :key="'value#' + lastValue.description"
    :bordered="false"
    :type="lastValue.colorType"
    round>
    <template v-if="props.icon" #avatar>
      <n-avatar
        :style="{
          background: 'transparent',
          color: getSerieColor(lastValue),
        }">
        <app-icon v-if="!settings.showChartTitle" :name="props.icon" />
        <app-icon v-else name="circle-filled" />
        <n-color-picker
          :actions="['clear']"
          :modes="['hsl', 'hex']"
          :value="getSerieColor(lastValue)"
          class="hidden-color-picker"
          @clear="onSerieColorRemove(lastValue)"
          @update:value="onSerieColorChange(lastValue, $event)" />
      </n-avatar>
    </template>
    <template #default>
      <n-flex size="small">
        {{ lastValue.description }}
        <app-skeleton-input :show="props.editMode" round>
          <n-flex class="number-container" justify="end">
            <n-number-animation
              :duration="props.animationDuration"
              :from="animationValues[lastValue.description].fromFormated"
              :precision="precision"
              :to="animationValues[lastValue.description].toFormated" />
            {{ getValueUnit(animationValues[lastValue.description].to, props.unit) }}
          </n-flex>
        </app-skeleton-input>
      </n-flex>
    </template>
  </n-tag>
</template>

<style lang="sass" scoped>
.number-container
  min-width: 3em

.hidden-color-picker
  opacity: 0
  position: absolute
  height: unset
  top: 0
  left: 0
  right: 0
  bottom: 0
</style>
