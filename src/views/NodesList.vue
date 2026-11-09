<script setup>
import AppSpin from "@/components/AppSpin.vue";
import StatsDetailedView from "@/components/Stats/StatsDetailedView.vue";
import StatsSummaryView from "@/components/Stats/StatsSummaryView.vue";
import StatsTableView from "@/components/Stats/StatsTableView.vue";
import AppIcon from "@/components/Utils/AppIcon.vue";
import { COMPONENTS, getStatSections, getStatSummary } from "@/models/metricSources";
import { useSystemStore } from "@/stores/system";
import { useUserStore } from "@/stores/user";
import { useMessage } from "naive-ui";
import { computed, onActivated, onDeactivated, ref } from "vue";
import { useI18n } from "vue-i18n";

const system = useSystemStore();
const user = useUserStore();
const message = useMessage();
const { t, locale } = useI18n();

const VIEWS = [
  { value: "summary", icon: "list" },
  { value: "table", icon: "table" },
  { value: "detailed", icon: "layout-grid" },
];

const query = ref("");
const component = ref("all");

// La page montre tout ce que remonte la lib : toutes les sources sont collectées tant qu'elle est
// ouverte, et les infos statiques du processeur sont lues une fois
onActivated(() => {
  system.requestFullCollection("nodes");
  system.loadCpuInfo();
});
onDeactivated(() => system.releaseFullCollection("nodes"));

// `locale` : les libellés et les formats de nombre suivent la langue
const summary = computed(() => locale.value && getStatSummary(system.metrics, system.info));
const sections = computed(() => locale.value && getStatSections(system.metrics, system.info));
const searchText = computed(() => query.value.trim().toLowerCase());

function matches(row) {
  return (
    !searchText.value ||
    [row.label, row.key, row.value].join(" ").toLowerCase().includes(searchText.value)
  );
}

function filterItems(items, selected = component.value) {
  return items
    .filter(item => selected === "all" || item.component === selected)
    .map(item => ({ ...item, rows: item.rows.filter(matches) }))
    .filter(item => item.rows.length);
}

const filteredSummary = computed(() => filterItems(summary.value));
const filteredSections = computed(() => filterItems(sections.value));
const view = computed({
  get: () => user.settings.statsView,
  set: value => (user.settings.statsView = value),
});

function countRows(items, selected) {
  return filterItems(items, selected).reduce((total, item) => total + item.rows.length, 0);
}

const chips = computed(() => {
  const items = view.value === "summary" ? summary.value : sections.value;

  return ["all", ...COMPONENTS]
    .filter(key => key === "all" || items.some(item => item.component === key))
    .map(key => ({ key, count: countRows(items, key) }));
});

// Nombre de valeurs de la vue détaillée par composant (bouton « Détails » de la synthèse)
const detailCounts = computed(() =>
  Object.fromEntries(
    COMPONENTS.map(key => [
      key,
      sections.value
        .filter(section => section.component === key)
        .reduce((total, section) => total + section.rows.length, 0),
    ])
  )
);

const noResult = computed(() => {
  const items = view.value === "summary" ? filteredSummary.value : filteredSections.value;

  return summary.value.length > 0 && items.length === 0;
});

function openDetails(selected) {
  component.value = selected;
  view.value = "detailed";
}

async function copyJson() {
  const json = JSON.stringify({ cpu: system.info.cpu, ...system.metrics }, null, 2);

  try {
    await navigator.clipboard.writeText(json);
    message.success(t("stats.copied"));
  } catch (error) {
    message.error(t("stats.copyFailed"));
    console.error(error);
  }
}
</script>

<template>
  <n-flex size="large" vertical>
    <n-flex align="end" justify="space-between">
      <n-flex :size="4" class="page-intro" vertical>
        <n-h1>{{ t("stats.title") }}</n-h1>
        <n-text depth="3">{{ t("stats.description") }}</n-text>
      </n-flex>
      <n-flex align="center">
        <n-input
          v-model:value="query"
          :placeholder="t('stats.searchPlaceholder')"
          class="search"
          clearable>
          <template #prefix>
            <app-icon name="search" />
          </template>
        </n-input>
        <n-button @click="user.settings.statsShowKeys = !user.settings.statsShowKeys">
          <template #icon>
            <app-icon :name="user.settings.statsShowKeys ? 'code-off' : 'code'" />
          </template>
          {{ user.settings.statsShowKeys ? t("stats.hideKeys") : t("stats.showKeys") }}
        </n-button>
        <n-button type="primary" @click="copyJson()">
          <template #icon>
            <app-icon name="copy" />
          </template>
          {{ t("stats.copyJson") }}
        </n-button>
      </n-flex>
    </n-flex>

    <n-flex align="center" justify="space-between">
      <n-flex :aria-label="t('stats.filters')" role="group">
        <n-tag
          v-for="chip in chips"
          :key="chip.key"
          :checked="component === chip.key"
          checkable
          round
          @update:checked="component = chip.key">
          {{ chip.key === "all" ? t("stats.all") : t(`stats.components.${chip.key}`) }}
          <span class="chip-count">{{ chip.count }}</span>
        </n-tag>
      </n-flex>
      <n-radio-group v-model:value="view" :aria-label="t('stats.views.label')">
        <n-radio-button v-for="item in VIEWS" :key="item.value" :value="item.value">
          <n-flex :size="6" :wrap="false" align="center">
            <app-icon :name="item.icon" size="1.1em" />
            {{ t(`stats.views.${item.value}`) }}
          </n-flex>
        </n-radio-button>
      </n-radio-group>
    </n-flex>

    <app-spin :show="!summary.length">
      <n-empty v-if="noResult" :description="t('stats.noResult', { query })" class="no-result" />
      <stats-summary-view
        v-else-if="view === 'summary'"
        :detail-counts="detailCounts"
        :groups="filteredSummary"
        :show-keys="user.settings.statsShowKeys"
        @details="openDetails($event)" />
      <stats-table-view
        v-else-if="view === 'table'"
        :sections="filteredSections"
        :show-keys="user.settings.statsShowKeys" />
      <stats-detailed-view
        v-else
        :searching="Boolean(searchText)"
        :sections="filteredSections"
        :show-keys="user.settings.statsShowKeys" />
    </app-spin>
  </n-flex>
</template>

<style lang="sass" scoped>
.page-intro
  max-width: 40em

  h1
    margin: 0

.search
  width: 21em

// Hérite de la couleur du tag, coché ou non : un gris fixe est illisible sur le tag coché
.chip-count
  margin-left: .4em
  opacity: .7

.no-result
  padding: 3em 0
</style>
