<script setup>
import ChartLine from "@renderer/components/ChartLine.vue";
import { useSystemStore } from "@renderer/stores/system";
import { useUserStore } from "@renderer/stores/user";
import { computed, ref, watch } from "vue";

const system = useSystemStore();
const user = useUserStore();

const listSummary = ref([]);

const colNumber = computed(() => {
  return user.settings.graphColumns ?? 2;
});

function setSummary() {
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

      list.push({
        max: 100,
        min: 0,
        title: "Utilisation",
        description: description,
        icon: "microchip",
        unit: "%",
        value: controller.utilizationGpu,
      });

      list.push({
        max: controller.vram,
        min: 0,
        title: "Utilisation VRAM",
        icon: "memory",
        description: description,
        unit: "Mo",
        value: controller.memoryUsed,
      });

      list.push({
        max: 100,
        min: 0,
        title: "Température",
        description: description,
        icon: "thermometer-half",
        unit: "°C",
        value: controller.temperatureGpu,
      });

      list.push({
        max: controller.powerLimit,
        min: 0,
        title: "Puissance",
        description: description,
        icon: "bolt",
        unit: "W",
        value: controller.powerDraw,
      });

      list.push({
        max: 5000,
        min: 0,
        title: "Horloge",
        icon: "wave-square",
        description: description,
        unit: "Mhz",
        value: controller.clockCore,
      });

      list.push({
        max: 100,
        min: 0,
        title: "Vitesse des ventilateurs",
        icon: "fan",
        description: description,
        unit: "%",
        value: controller.fanSpeed,
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

  listSummary.value = list;
}

function getEntryList(list, { title, description, icon, value, unit, min, max }) {
  if (value !== undefined && value !== null) {
    list.push({ title, description, icon, value, unit, min, max });
  }
}

watch(system, () => {
  setSummary();
});
</script>

<template>
  <n-flex>
    <n-grid :cols="colNumber" x-gap="14" y-gap="14">
      <n-gi v-for="item in listSummary" :key="item.title">
        <chart-line
          :data="item.value"
          :description="item.description"
          :icon="item.icon"
          :max="item.max"
          :min="item.min"
          :title="item.title"
          :unit="item.unit" />
      </n-gi>
    </n-grid>
  </n-flex>
</template>

<style lang="sass" scoped>
.graph-card
  flex: 1
  min-width: 25em
</style>
