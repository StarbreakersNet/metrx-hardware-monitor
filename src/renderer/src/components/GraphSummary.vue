<script setup>
import ChartLine from "@renderer/components/Charts/ChartLine.vue";
import { useSystemStore } from "@renderer/stores/system";
import { useUserStore } from "@renderer/stores/user";
import { computed, onMounted, ref, watch } from "vue";
import { useLoadingBar } from "naive-ui";
import AppSpin from "@renderer/components/AppSpin.vue";
import { VueDraggable } from "vue-draggable-plus";
import _ from "lodash";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import GraphSummaryMergeModal from "@renderer/components/GraphSummaryMergeModal.vue";

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
      icon: "microchip",
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
      icon: "thermometer-half",
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
        icon: "microchip",
        unit: "%",
        value: controller.utilizationGpu ?? 0,
      });

      getEntryList(list, {
        max: controller.vram,
        min: 0,
        title: "Utilisation VRAM",
        icon: "memory",
        description: description,
        unit: "Mo",
        value: controller.memoryUsed,
      });

      getEntryList(list, {
        max: 100,
        min: 0,
        title: "Température",
        description: description,
        icon: "thermometer-half",
        unit: "°C",
        value: controller.temperatureGpu ?? 0,
      });

      getEntryList(list, {
        max: controller.powerLimit,
        min: 0,
        title: "Puissance",
        description: description,
        icon: "bolt",
        unit: "W",
        value: controller.powerDraw ?? 0,
      });

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
        icon: "fan",
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
      icon: "memory",
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
  // Tous les IDs des graphiques qui seront fusionnés (ils n'apparaîtront pas individuellement)
  const mergedIds = Object.values(user.settings.chartsMerged).flat();

  // Créer une copie du tableau original pour ne pas le modifier
  const allGraphs = [...list];

  // Filtrer les graphiques qui ne doivent pas être affichés individuellement
  const filteredList = list.filter(item => !mergedIds.includes(item.id));

  // Résultat final
  const result = [];

  // Parcourir les graphiques filtrés
  for (const graph of filteredList) {
    // Vérifier si c'est un graphique maître qui a des graphiques liés
    const linkedGraphIds = user.settings.chartsMerged[graph.id] || [];

    if (linkedGraphIds.length > 0) {
      // Récupérer les graphiques liés
      const linkedGraphs = linkedGraphIds
        .map(id => allGraphs.find(item => item.id === id))
        .filter(Boolean);

      // Créer une copie du graphique avec value transformé en tableau
      const mergedGraph = {
        ...graph,
        value: [
          { description: graph.description, value: graph.value },
          ...linkedGraphs.map(linkedGraph => ({
            description: linkedGraph.description,
            value: linkedGraph.value,
          })),
        ],
        mergedGraphs: linkedGraphs,
      };

      result.push(mergedGraph);
    } else {
      // Si c'est un graphique simple, transformer quand même value en tableau
      // pour avoir une structure uniforme
      result.push(graph);
    }
  }

  return result;
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
        <font-awesome-icon :icon="['fas', 'ellipsis-vertical']" />
        <template #menu>
          <n-float-button @click="resetChartsOrder()">
            <font-awesome-icon :icon="['fas', 'rotate-right']" />
          </n-float-button>
          <n-float-button @click="showMergeModal = true">
            <font-awesome-icon :icon="['fas', 'object-group']" />
          </n-float-button>
          <n-float-button @click="editMode = false">
            <font-awesome-icon :icon="['fas', 'check']" />
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
