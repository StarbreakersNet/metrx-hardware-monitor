<script setup>
import _ from "lodash";
import { computed } from "vue";
import { useUserStore } from "@renderer/stores/user";
import { useSystemStore } from "@renderer/stores/system";

const showModel = defineModel("show", {
  type: Boolean,
  default: false,
});
const emit = defineEmits({
  validate: () => true,
});

const user = useUserStore();
const system = useSystemStore();

const listSummary = computed(() => {
  let list = [];

  if (system.metrics.currentLoad) {
    getEntryList(list, {
      title: "Utilisation",
      description: "CPU",
      unit: "%",
    });
  }
  if (system.metrics.cpuCurrentSpeed) {
    getEntryList(list, {
      title: "Horloge",
      description: "CPU",
      unit: "Ghz",
    });
  }
  if (system.metrics.cpuTemperature) {
    getEntryList(list, {
      title: "Température",
      description: "CPU",
      unit: "°C",
    });
  }
  if (system.metrics.graphics) {
    system.metrics.graphics.controllers.forEach((controller, index) => {
      let description = "GPU";

      if (system.metrics.graphics.controllers.length > 1) {
        description += " " + index;
      }

      getEntryList(list, {
        title: "Utilisation",
        description: description,
        unit: "%",
      });

      getEntryList(list, {
        title: "Utilisation VRAM",
        description: description,
        unit: "Mo",
      });

      getEntryList(list, {
        title: "Température",
        description: description,
        unit: "°C",
      });

      getEntryList(list, {
        title: "Puissance",
        description: description,
        unit: "W",
      });

      getEntryList(list, {
        title: "Horloge",
        description: description,
        unit: "Mhz",
      });

      getEntryList(list, {
        title: "Vitesse des ventilateurs",
        description: description,
        unit: "%",
      });
    });
  }
  if (system.metrics.mem) {
    getEntryList(list, {
      title: "Utilisation",
      description: "RAM",
      unit: "B",
    });
  }

  return _.sortBy(list, "order");
});

function getEntryList(list, { title, description, unit }) {
  let id = (title + "#" + description).toLowerCase();
  list.push({
    id,
    title,
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
    :content-style="{ overflow: 'auto' }"
    :style="{ width: '75vw', height: '75vh' }"
    content-class="scroll-layout-container"
    preset="card"
    size="small"
    title="Fusion des graphiques">
    <template #default>
      <n-scrollbar>
        <n-flex class="sb-scrollbar-overlaping">
          <n-grid :cols="user.settings.graphColumns" x-gap="12" y-gap="12">
            <n-gi v-for="item in listSummary" :key="item.title + '#' + item.description">
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
      </n-scrollbar>
    </template>
    <template #action>
      <n-flex justify="end">
        <n-button @click="user.settings.chartsMerged = {}">Réinitialiser</n-button>
        <n-button type="primary" @click="onModalConfirm()">Valider</n-button>
      </n-flex>
    </template>
  </n-modal>
</template>

<style lang="sass" scoped>
.disabled
  opacity: 0.5
</style>
