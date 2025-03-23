<script setup>
import ChartLine from "@renderer/components/ChartLine.vue";
import { useSystemStore } from "@renderer/stores/system";
import { useUserStore } from "@renderer/stores/user";
import { computed, onMounted, ref, watch } from "vue";
import { useLoadingBar } from "naive-ui";
import AppSpin from "@renderer/components/AppSpin.vue";

const system = useSystemStore();
const user = useUserStore();
const loadingBar = useLoadingBar();

const listSummary = ref([]);

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

      list.push({
        max: 100,
        min: 0,
        title: "Utilisation",
        description: description,
        icon: "microchip",
        unit: "%",
        value: controller.utilizationGpu ?? 0,
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
        value: controller.temperatureGpu ?? 0,
      });

      list.push({
        max: controller.powerLimit,
        min: 0,
        title: "Puissance",
        description: description,
        icon: "bolt",
        unit: "W",
        value: controller.powerDraw ?? 0,
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

  listSummary.value = list;
  loadingBar.finish();
}

function getEntryList(list, { title, description, icon, value, unit, min, max }) {
  if (value !== undefined && value !== null) {
    list.push({ title, description, icon, value, unit, min, max });
  }
}

function getFormatedStyle(index) {
  return {
    "transition-delay": index * 0.05 + "s",
    "min-width": "calc(100% / " + (colNumber.value + 1) + ")",
  };
}

onMounted(() => {
  watch(system, () => {
    setSummary();
  });
});
</script>

<template>
  <app-spin :show="listSummary.length <= 0">
    <transition-group class="graph-grid" name="fade-y" tag="div">
      <chart-line
        v-for="(item, index) in listSummary"
        :key="item.title + '#' + item.description"
        :data="item.value"
        :description="item.description"
        :icon="item.icon"
        :max="item.max"
        :min="item.min"
        :style="getFormatedStyle(index)"
        :title="item.title"
        :unit="item.unit"
        class="graph-item" />
    </transition-group>
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
