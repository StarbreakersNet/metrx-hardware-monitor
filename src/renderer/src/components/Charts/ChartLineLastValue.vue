<script setup>
import { formatValue, getValueUnit } from "@renderer/appUtils";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import AppSkeletonInput from "@renderer/components/AppSkeletonInput.vue";
import { useUserStore } from "@renderer/stores/user";

import { computed, ref } from "vue";

const props = defineProps({
  lastValueCollection: {
    type: Array,
    default: () => [{ value: 0, description: "undefined", colorType: "default" }],
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
  return serie.colorSerie ?? "var(--n-color-text-default)";
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
          backgroundColor: 'transparent',
          color: 'var(--n-color-text-default)',
        }">
        <font-awesome-icon v-if="!settings.showChartTitle" :icon="['fas', props.icon]" />
        <font-awesome-icon v-else :icon="['fas', 'circle']" />
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
</style>
