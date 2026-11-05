<script setup>
import _ from "lodash";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
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

const listSummary = computed(() => {
  let list = [];

  if (system.metrics.currentLoad) {
    getEntryList(list, {
      titleKey: "usage",
      description: "CPU",
      unit: "%",
    });
  }
  if (system.metrics.cpuCurrentSpeed) {
    getEntryList(list, {
      titleKey: "clock",
      description: "CPU",
      unit: "Ghz",
    });
  }
  if (system.metrics.cpuTemperature) {
    getEntryList(list, {
      titleKey: "temperature",
      description: "CPU",
      unit: "°C",
    });
  }
  if (system.metrics.gpu?.length) {
    system.metrics.gpu.forEach((controller, index) => {
      let description = "GPU";

      if (system.metrics.gpu.length > 1) {
        description += " " + index;
      }

      getEntryList(list, {
        titleKey: "usage",
        description: description,
        unit: "%",
      });

      getEntryList(list, {
        titleKey: "vramUsage",
        description: description,
        unit: "Mo",
      });

      getEntryList(list, {
        titleKey: "temperature",
        description: description,
        unit: "°C",
      });

      getEntryList(list, {
        titleKey: "power",
        description: description,
        unit: "W",
      });

      getEntryList(list, {
        titleKey: "clock",
        description: description,
        unit: "Mhz",
      });

      getEntryList(list, {
        titleKey: "fanSpeed",
        description: description,
        unit: "%",
      });
    });
  }
  if (system.metrics.mem) {
    getEntryList(list, {
      titleKey: "usage",
      description: "RAM",
      unit: "B",
    });
  }

  return _.sortBy(list, "order");
});

// Même id que dans GraphSummary.vue (clé du titre + description)
function getEntryList(list, { titleKey, description, unit }) {
  let id = (titleKey + "#" + description).toLowerCase();
  list.push({
    id,
    title: t(`charts.titles.${titleKey}`),
    description,
    unit,
    order: user.settings.chartsOrder[id] ?? 0,
    disabled: isEntryDisabled(id),
  });
}

function isEntryDisabled(id) {
  return Object.entries(user.settings.chartsMerged).some(([graphId, mergedIds]) => {
    return mergedIds.includes(id) && graphId !== id;
  });
}

function isOptionDisabled(entryId, currentGraphId) {
  const isMergedInOtherGraph = Object.entries(user.settings.chartsMerged).some(
    ([graphId, mergedIds]) => {
      return mergedIds.includes(entryId) && graphId !== currentGraphId;
    }
  );

  const hasMergedGraphs = user.settings.chartsMerged[entryId]?.length > 0;

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
  return user.settings.chartsMerged[id] ?? [];
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
                  {{ item.unit }}
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
