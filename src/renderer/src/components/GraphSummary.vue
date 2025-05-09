<script setup>
import AppSpin from "@renderer/components/AppSpin.vue";
import ChartLine from "@renderer/components/Charts/ChartLine.vue";
import GraphSummaryMergeModal from "@renderer/components/GraphSummaryMergeModal.vue";
import AppIcon from "@renderer/components/Utils/AppIcon.vue";
import { useSystemStore } from "@renderer/stores/system";
import { useUserStore } from "@renderer/stores/user";
import _ from "lodash";
import { useLoadingBar } from "naive-ui";
import { computed, onMounted, ref, watch } from "vue";
import { VueDraggable } from "vue-draggable-plus";

const system = useSystemStore();
const user = useUserStore();
const loadingBar = useLoadingBar();

const listSummary = ref([]);
const editMode = ref(false);
const showMergeModal = ref(false);

const colNumber = computed(() => {
  return user.settings.graphColumns ?? 2;
});

function setSummary() {
  loadingBar.start();
  let list = [];

  if (system.metrics.currentLoad) {
    getEntryList(list, {
      max: 100,
      min: 0,
      title: "Utilisation",
      description: "CPU",
      icon: "cpu",
      unit: "%",
      value: system.metrics.currentLoad.currentLoad,
    });
  }
  if (system.metrics.cpuCurrentSpeed) {
    getEntryList(list, {
      max: system.metrics.cpuCurrentSpeed?.max,
      min: 0,
      title: "Horloge",
      description: "CPU",
      icon: "wave-square",
      unit: "Ghz",
      value: system.metrics.cpuCurrentSpeed?.avg,
    });
  }
  if (system.metrics.cpuTemperature) {
    getEntryList(list, {
      max: 100,
      min: 0,
      title: "Température",
      description: "CPU",
      icon: "temperature",
      unit: "°C",
      value: system.metrics.cpuTemperature.main,
    });
  }
  if (system.metrics.graphics) {
    system.metrics.graphics.controllers.forEach((controller, index) => {
      let description = "GPU";

      if (system.metrics.graphics.controllers.length > 1) {
        description += " " + index;
      }

      getEntryList(list, {
        max: 100,
        min: 0,
        title: "Utilisation",
        description: description,
        icon: "cpu2",
        unit: "%",
        value: controller.utilizationGpu ?? 0,
      });

      if (controller.vram) {
        getEntryList(list, {
          max: controller.vram,
          min: 0,
          title: "Utilisation VRAM",
          icon: "section-filled",
          description: description,
          unit: "Mo",
          value: controller.memoryUsed,
        });
      }

      getEntryList(list, {
        max: 100,
        min: 0,
        title: "Température",
        description: description,
        icon: "temperature",
        unit: "°C",
        value: controller.temperatureGpu ?? 0,
      });

      if (controller.powerLimit) {
        getEntryList(list, {
          max: controller.powerLimit,
          min: 0,
          title: "Puissance",
          description: description,
          icon: "bolt",
          unit: "W",
          value: controller.powerDraw ?? 0,
        });
      }

      getEntryList(list, {
        max: 5000,
        min: 0,
        title: "Horloge",
        icon: "wave-square",
        description: description,
        unit: "Mhz",
        value: controller.clockCore,
      });

      getEntryList(list, {
        max: 100,
        min: 0,
        title: "Vitesse des ventilateurs",
        icon: "windmill-filled",
        description: description,
        unit: "%",
        value: controller.fanSpeed ?? 0,
      });
    });
  }
  if (system.metrics.mem) {
    getEntryList(list, {
      max: system.metrics.mem.total,
      min: 0,
      title: "Utilisation",
      description: "RAM",
      icon: "section-filled",
      unit: "B",
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

    return {
      ...graph,
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

function getEntryList(list, { title, description, icon, value, unit, min, max }) {
  let id = (title + "#" + description).toLowerCase();
  list.push({
    id,
    title,
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
  watch(
    () => system.metrics,
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
      <transition-group class="graph-grid sort-target" name="fade-y" tag="div" type="transition">
        <chart-line
          v-for="(item, index) in listSummary"
          :key="item.title + '#' + item.description"
          :buffer-size="user.settings.chartBufferSize"
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
  gap: 1em
  min-height: 5em

.graph-item
  flex-grow: 1
  flex-shrink: 1
  flex-basis: 0
</style>
