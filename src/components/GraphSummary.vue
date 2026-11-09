<script setup>
import AppSpin from "@/components/AppSpin.vue";
import ChartLine from "@/components/Charts/ChartLine.vue";
import GraphSummaryMergeModal from "@/components/GraphSummaryMergeModal.vue";
import AppIcon from "@/components/Utils/AppIcon.vue";
import { useSystemStore } from "@/stores/system";
import {
  getActiveMerges,
  getChartEntries,
  getMergeableEntries,
  getVisibleEntries,
} from "@/models/chartEntries";
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
  // Tuiles masquées depuis la page Sondes exclues ; les non disponibles restent affichées
  let list = getVisibleEntries(getChartEntries(system.metrics), user.settings.chartsHidden).map(
    entry => ({
      ...entry,
      title: t(`charts.titles.${entry.titleKey}`),
      order: user.settings.chartsOrder[entry.id] ?? 0,
    })
  );

  list = _.sortBy(list, "order");
  list = processMergedCharts(list);

  listSummary.value = list;
  loadingBar.finish();
}

function processMergedCharts(list) {
  // Seules les tuiles dont la valeur est remontée se fusionnent
  const merges = getActiveMerges(
    user.settings.chartsMerged,
    getMergeableEntries(list, user.settings.chartsHidden)
  );
  const mergedIds = Object.values(merges).flat();
  const filteredList = list.filter(item => !mergedIds.includes(item.id));

  return filteredList.map(graph => {
    const linkedGraphIds = merges[graph.id] ?? [];

    if (!linkedGraphIds.length) {
      return graph;
    }

    const linkedGraphs = linkedGraphIds.map(id => list.find(item => item.id === id));
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
    [() => system.metrics, locale, () => JSON.stringify(user.settings.chartsHidden)],
    () => {
      setSummary();
    },
    {
      immediate: true,
    }
  );
});

function hideChart(id) {
  user.settings.chartsHidden[id] = true;
}
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
          :available="item.available"
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
          @edit-orders="toggleEditMode()"
          @hide="hideChart(item.id)" />
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
