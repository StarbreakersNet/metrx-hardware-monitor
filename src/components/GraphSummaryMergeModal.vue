<script setup>
import { getUnitLabel } from "@/appUtils";
import _ from "lodash";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { getActiveMerges, getChartEntries } from "@/models/chartEntries";
import { useUserStore } from "@/stores/user";
import { useSystemStore } from "@/stores/system";
import AppScrollLayout from "@/components/Layouts/AppScrollLayout.vue";

const showModel = defineModel("show", {
  type: Boolean,
  default: false,
});
defineEmits({
  validate: () => true,
});

const user = useUserStore();
const system = useSystemStore();
const { t } = useI18n();

// Mêmes graphiques que l'accueil (GraphSummary.vue) : on ne propose que ce qui est affiché
const entries = computed(() => getChartEntries(system.metrics));
const activeMerges = computed(() => getActiveMerges(user.settings.chartsMerged, entries.value));

const listSummary = computed(() => {
  const list = entries.value.map(({ id, titleKey, description, unit }) => ({
    id,
    title: t(`charts.titles.${titleKey}`),
    description,
    unit,
    order: user.settings.chartsOrder[id] ?? 0,
    disabled: isEntryDisabled(id),
  }));

  return _.sortBy(list, "order");
});

function isEntryDisabled(id) {
  return Object.entries(activeMerges.value).some(([graphId, mergedIds]) => {
    return mergedIds.includes(id) && graphId !== id;
  });
}

function isOptionDisabled(entryId, currentGraphId) {
  const isMergedInOtherGraph = Object.entries(activeMerges.value).some(([graphId, mergedIds]) => {
    return mergedIds.includes(entryId) && graphId !== currentGraphId;
  });

  const hasMergedGraphs = activeMerges.value[entryId]?.length > 0;

  return isMergedInOtherGraph || hasMergedGraphs;
}

function getSameUnitEntry(unit, excludeId) {
  return _.sortBy(listSummary.value, "order")
    .filter(entry => entry.unit === unit && entry.id !== excludeId)
    .map(entry => ({
      label: `${entry.title} ${entry.description}`,
      value: entry.id,
      disabled: isOptionDisabled(entry.id, excludeId),
    }));
}

function onEntrySelected(id, event) {
  user.settings.chartsMerged[id] = event;
}

function onModalConfirm() {
  showModel.value = false;
}

function getSelectValues(id) {
  return activeMerges.value[id] ?? [];
}
</script>

<template>
  <n-modal
    v-model:show="showModel"
    :content-style="{ overflow: 'auto', padding: '0' }"
    :style="{ width: '75vw' }"
    preset="card"
    size="small"
    :title="t('charts.mergeTitle')">
    <template #default>
      <app-scroll-layout :style="{ height: '75vh' }" color="var(--n-color-modal)">
        <n-flex class="sb-scrollbar-overlaping">
          <n-grid :cols="user.settings.chartColumns" x-gap="12" y-gap="12">
            <n-gi v-for="item in listSummary" :key="item.id">
              <n-card :class="{ disabled: item.disabled }" size="small">
                <template #header>
                  <n-text :delete="item.disabled">{{ item.title }} {{ item.description }}</n-text>
                </template>
                <template #header-extra>
                  {{ getUnitLabel(item.unit) }}
                </template>
                <template #default>
                  <n-select
                    :disabled="item.disabled"
                    :options="getSameUnitEntry(item.unit, item.id)"
                    :value="getSelectValues(item.id)"
                    multiple
                    @update:value="onEntrySelected(item.id, $event)" />
                </template>
              </n-card>
            </n-gi>
          </n-grid>
        </n-flex>
      </app-scroll-layout>
    </template>
    <template #action>
      <n-flex justify="end">
        <n-button @click="user.settings.chartsMerged = {}">{{ t("common.reset") }}</n-button>
        <n-button type="primary" @click="onModalConfirm()">{{ t("common.validate") }}</n-button>
      </n-flex>
    </template>
  </n-modal>
</template>

<style lang="sass" scoped>
.disabled
  opacity: 0.5
</style>
