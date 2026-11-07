<script setup>
import AppSpin from "@/components/AppSpin.vue";
import ChartLine from "@/components/Charts/ChartLine.vue";
import GraphSummaryMergeModal from "@/components/GraphSummaryMergeModal.vue";
import AppIcon from "@/components/Utils/AppIcon.vue";
import { useSystemStore } from "@/stores/system";
import { mebibytesToBytes, UNITS } from "@/models/units";
import { useUserStore } from "@/stores/user";
import _ from "lodash";
import { useLoadingBar } from "naive-ui";
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { VueDraggable } from "vue-draggable-plus";

const system = useSystemStore();
const user = useUserStore();
const loadingBar = useLoadingBar();
const { t, locale } = useI18n();

const listSummary = ref([]);
const editMode = ref(false);
const showMergeModal = ref(false);

const colNumber = computed(() => {
  return user.settings.chartColumns ?? 2;
});

function setSummary() {
  let list = [];

  if (system.metrics.currentLoad) {
    getEntryList(list, {
      max: 100,
      min: 0,
      titleKey: "usage",
      description: "CPU",
      icon: "cpu",
      unit: UNITS.PERCENT,
      value: system.metrics.currentLoad.currentLoad,
    });
  }
  if (system.metrics.cpuCurrentSpeed) {
    getEntryList(list, {
      max: system.metrics.cpuCurrentSpeed?.max,
      min: 0,
      titleKey: "clock",
      description: "CPU",
      icon: "wave-square",
      unit: UNITS.GIGAHERTZ,
      value: system.metrics.cpuCurrentSpeed?.avg,
    });
  }
  if (system.metrics.cpuTemperature) {
    getEntryList(list, {
      max: 100,
      min: 0,
      titleKey: "temperature",
      description: "CPU",
      icon: "temperature",
      unit: UNITS.CELSIUS,
      value: system.metrics.cpuTemperature.main,
    });
  }
  if (system.metrics.gpu?.length) {
    system.metrics.gpu.forEach((controller, index) => {
      let description = "GPU";

      if (system.metrics.gpu.length > 1) {
        description += " " + index;
      }

      getEntryList(list, {
        max: 100,
        min: 0,
        titleKey: "usage",
        description: description,
        icon: "cpu2",
        unit: UNITS.PERCENT,
        value: controller.utilizationGpu ?? 0,
      });

      if (controller.vram) {
        getEntryList(list, {
          max: mebibytesToBytes(controller.vram),
          min: 0,
          titleKey: "vramUsage",
          icon: "section-filled",
          description: description,
          unit: UNITS.BYTES,
          value: mebibytesToBytes(controller.memoryUsed),
        });
      }

      getEntryList(list, {
        max: 100,
        min: 0,
        titleKey: "temperature",
        description: description,
        icon: "temperature",
        unit: UNITS.CELSIUS,
        value: controller.temperatureGpu ?? 0,
      });

      if (controller.powerLimit) {
        getEntryList(list, {
          max: controller.powerLimit,
          min: 0,
          titleKey: "power",
          description: description,
          icon: "bolt-filled",
          unit: UNITS.WATT,
          value: controller.powerDraw ?? 0,
        });
      }

      getEntryList(list, {
        max: 5000,
        min: 0,
        titleKey: "clock",
        icon: "wave-square",
        description: description,
        unit: UNITS.MEGAHERTZ,
        value: controller.clockCore,
      });

      getEntryList(list, {
        max: 100,
        min: 0,
        titleKey: "fanSpeed",
        icon: "windmill-filled",
        description: description,
        unit: UNITS.PERCENT,
        value: controller.fanSpeed ?? 0,
      });
    });
  }
  if (system.metrics.mem) {
    getEntryList(list, {
      max: system.metrics.mem.total,
      min: 0,
      titleKey: "usage",
      description: "RAM",
      icon: "section-filled",
      unit: UNITS.BYTES,
      value: system.metrics.mem.used,
    });
  }

  list = _.sortBy(list, "order");
  list = processMergedCharts(list);

  listSummary.value = list;
  loadingBar.finish();
}

function processMergedCharts(list) {
  const mergedIds = Object.values(user.settings.chartsMerged).flat();
  const allGraphs = [...list];
  const filteredList = list.filter(item => !mergedIds.includes(item.id));

  return filteredList.map(graph => {
    const linkedGraphIds = user.settings.chartsMerged[graph.id] || [];

    if (!linkedGraphIds.length) {
      return graph;
    }

    const linkedGraphs = linkedGraphIds
      .map(id => allGraphs.find(item => item.id === id))
      .filter(Boolean);

    const allLinked = [graph, ...linkedGraphs];

    return {
      ...graph,
      // L'échelle couvre toutes les séries fusionnées (ex. VRAM 8 Go + RAM 32 Go)
      min: getMergedBound(
        allLinked.map(item => item.min),
        Math.min
      ),
      max: getMergedBound(
        allLinked.map(item => item.max),
        Math.max
      ),
      value: [
        { description: graph.description, value: graph.value },
        ...linkedGraphs.map(({ description, value }) => ({ description, value })),
      ],
      mergedGraphs: linkedGraphs.map(({ id, title, description, icon, min, max }) => ({
        id,
        title,
        description,
        icon,
        min,
        max,
      })),
    };
  });
}

// Sans borne sur l'une des séries, l'échelle reste automatique
function getMergedBound(bounds, pick) {
  return bounds.every(Number.isFinite) ? pick(...bounds) : undefined;
}

// L'id (ordre, fusions) repose sur la clé du titre et non sur le texte traduit :
// changer de langue ne fait pas perdre la configuration des graphiques.
function getEntryList(list, { titleKey, description, icon, value, unit, min, max }) {
  let id = (titleKey + "#" + description).toLowerCase();
  list.push({
    id,
    title: t(`charts.titles.${titleKey}`),
    description,
    icon,
    value: value ?? 0,
    unit,
    min,
    max,
    order: user.settings.chartsOrder[id] ?? 0,
  });
}

function getFormatedStyle(index) {
  return {
    "transition-delay": index * 0.05 + "s",
    "min-width": "calc(100% / " + (colNumber.value + 1) + ")",
  };
}

function toggleEditMode() {
  editMode.value = !editMode.value;
}

async function updateChartsOrder() {
  user.settings.chartsOrder = {};

  listSummary.value.forEach((item, index) => {
    user.settings.chartsOrder[item.id] = index;
  });
}

function resetChartsOrder() {
  user.settings.chartsOrder = {};
  setSummary();
  editMode.value = false;
}

onMounted(() => {
  loadingBar.start();
  watch(
    [() => system.metrics, locale],
    () => {
      setSummary();
    },
    {
      immediate: true,
    }
  );
});
</script>

<template>
  <app-spin :show="listSummary.length <= 0">
    <vue-draggable
      ref="draggableListRef"
      v-model="listSummary"
      :animation="300"
      :disabled="!editMode"
      target=".sort-target"
      @update="updateChartsOrder()">
      <transition-group
        class="graph-grid sort-target tw:gap-3"
        name="fade-y"
        tag="div"
        type="transition">
        <chart-line
          v-for="(item, index) in listSummary"
          :key="item.id"
          :buffer-size="user.settings.chartBufferSize"
          :chart-key="item.id"
          :data="item.value"
          :description="item.description"
          :edit-mode="editMode"
          :icon="item.icon"
          :max="item.max"
          :merged-graphs="item.mergedGraphs"
          :min="item.min"
          :style="getFormatedStyle(index)"
          :title="item.title"
          :unit="item.unit"
          class="graph-item"
          @edit-orders="toggleEditMode()" />
      </transition-group>
    </vue-draggable>
    <transition name="insert">
      <n-float-button
        v-if="editMode"
        bottom="4em"
        left="0"
        menu-trigger="hover"
        position="fixed"
        right="0"
        style="margin: auto"
        type="primary">
        <app-icon name="dots-vertical" />
        <template #menu>
          <n-float-button @click="resetChartsOrder()">
            <app-icon name="rotate-2" />
          </n-float-button>
          <n-float-button @click="showMergeModal = true">
            <app-icon name="layers-linked" />
          </n-float-button>
          <n-float-button @click="editMode = false">
            <app-icon name="check" />
          </n-float-button>
        </template>
      </n-float-button>
    </transition>
    <graph-summary-merge-modal v-model:show="showMergeModal" />
  </app-spin>
</template>

<style lang="sass" scoped>
.graph-grid
  display: flex
  flex-flow: row wrap
  min-height: 5em

.graph-item
  flex-grow: 1
  flex-shrink: 1
  flex-basis: 0
</style>
