<script setup>
import { getCommonScale, getValueUnit } from "@/appUtils";
import { UNITS } from "@/models/units";
import AppSkeletonInput from "@/components/AppSkeletonInput.vue";
import AppIcon from "@/components/Utils/AppIcon.vue";
import { useUserStore } from "@/stores/user";
import { computed, ref, watch } from "vue";

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

/**
 * Statistiques calculées sur les valeurs brutes (octets, hertz…), puis affichées sur un multiple
 * commun avec leur unité : comparer des nombres déjà mis à l'échelle mélangeait les ordres de
 * grandeur (900 MHz contre 4,4 GHz donnait un minimum de 4,4).
 */
const MAX_VALUES = 60;
const seriesValues = ref({});
const previous = ref({ min: 0, max: 0, average: 0 });
const current = ref({ min: 0, max: 0, average: 0 });

watch(
  () => props.lastValueCollection,
  newCollection => {
    newCollection.forEach(item => {
      // Valeur non remontée (tuile « Non disponible ») : ignorée, pas comptée comme 0
      if (!Number.isFinite(item.value)) {
        return;
      }

      const values = (seriesValues.value[item.description] ??= []);

      values.push(item.value);
      if (values.length > MAX_VALUES) {
        values.shift();
      }
    });

    // Toutes les séries d'un graphique fusionné ensemble
    const allValues = Object.values(seriesValues.value).flat();

    if (!allValues.length) {
      return;
    }

    previous.value = current.value;
    current.value = {
      min: Math.min(...allValues),
      max: Math.max(...allValues),
      average: allValues.reduce((sum, value) => sum + value, 0) / allValues.length,
    };
  },
  { immediate: true, deep: true }
);

const scale = computed(() =>
  getCommonScale(Math.max(Math.abs(current.value.min), Math.abs(current.value.max)), props.unit)
);

/**
 * L'unité est déjà dans le tag de la valeur actuelle : on ne la répète que si les statistiques
 * sont sur un autre multiple (4,4 GHz au maximum pour 900 MHz actuellement), pour qu'un nombre
 * seul ne soit jamais ambigu.
 */
const showUnit = computed(() => {
  const currentUnits = props.lastValueCollection
    .filter(item => Number.isFinite(item.value))
    .map(item => getValueUnit(item.value, props.unit));

  return !currentUnits.length || currentUnits.some(unit => unit !== scale.value.symbol);
});

/** Ordre d'affichage : minimum, maximum, moyenne */
const stats = computed(() =>
  [
    { key: "min", icon: "arrow-down", type: "info", visible: chartConfigValues.value.showMinMax },
    { key: "max", icon: "arrow-up", type: "warning", visible: chartConfigValues.value.showMinMax },
    {
      key: "average",
      icon: "divide",
      type: "default",
      visible: chartConfigValues.value.showAverage,
    },
  ]
    .filter(stat => stat.visible)
    .map(stat => ({
      ...stat,
      from: previous.value[stat.key] / scale.value.divisor,
      to: current.value[stat.key] / scale.value.divisor,
    }))
);

// Pourcentages et températures arrondis ; octets et hertz gardent leurs décimales une fois mis
// à l'échelle (2,4 GHz)
const displayPrecision = computed(() =>
  [UNITS.BYTES, UNITS.HERTZ].includes(props.unit) ? 2 : props.precision
);
</script>

<template>
  <transition-group name="insert">
    <n-tag v-for="stat in stats" :key="stat.key" :bordered="false" :type="stat.type" round>
      <app-skeleton-input :show="editMode" round>
        <n-flex :wrap="false" align="center" size="small">
          <app-icon :name="stat.icon" />
          <span class="stat-value">
            <n-number-animation
              :duration="animationDuration"
              :from="stat.from"
              :precision="displayPrecision"
              :to="stat.to" />
            <template v-if="showUnit">{{ scale.symbol }}</template>
          </span>
        </n-flex>
      </app-skeleton-input>
    </n-tag>
  </transition-group>
</template>

<style lang="sass" scoped>
.stat-value
  white-space: nowrap
  font-variant-numeric: tabular-nums
</style>
