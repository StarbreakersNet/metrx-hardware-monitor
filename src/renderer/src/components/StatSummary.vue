<script setup>
import { formatBytes, formatValue, getValueUnit } from "@renderer/appUtils";
import { useSystemStore } from "@renderer/stores/system";
import { NA } from "naive-ui";
import { h, ref, watch } from "vue";

const system = useSystemStore();

const listSummary = ref([]);
const columns = [
  {
    title: "Nom",
    key: "label",
  },
  {
    title: "Valeur",
    key: "value",
  },
  {
    title: "Unité",
    key: "valueAppend",
  },
  {
    title: "Documentation",
    key: "link",
  },
];
const renderCell = (value, rowData, column) => {
  if (column.key === "link" && value) {
    return h(NA, { href: value, target: "_blank" }, { default: () => "Voir la documentation" });
  } else {
    return value;
  }
};

function setSummary() {
  let list = [];

  if (system.metrics.time) {
    let listEntry = [];

    getEntryList(listEntry, "Heure", new Date(system.metrics.time.current).toLocaleTimeString());
    getEntryList(listEntry, "Date", new Date(system.metrics.time.current).toLocaleDateString());

    list.push({
      label: "Temps",
      listEntry,
      link: "https://systeminformation.io/general.html",
    });
  }

  if (system.metrics.currentLoad || system.info.cpu) {
    let listEntry = [];

    getEntryList(listEntry, "Constructeur", system.info.cpu?.manufacturer);
    getEntryList(listEntry, "Modèle", system.info.cpu?.brand);
    getEntryList(listEntry, "Coeurs", system.info.cpu?.physicalCores);
    getEntryList(listEntry, "Processeurs logiques", system.info.cpu?.cores);
    getEntryList(listEntry, "Socket", system.info.cpu?.socket);
    getEntryList(listEntry, "Utilisation", system.metrics.currentLoad?.currentLoad, "%");
    getEntryList(listEntry, "Température", system.metrics.cpuTemperature?.main, "°C");
    getEntryList(listEntry, "Horloge", system.metrics.cpuCurrentSpeed?.avg, "Mhz");
    getEntryList(
      listEntry,
      "Virtualisation",
      system.info.cpu?.virtualization ? "Activé" : "Désactivé"
    );

    list.push({
      label: "CPU",
      listEntry,
      link: "https://systeminformation.io/cpu.html",
    });
  }

  if (system.metrics.graphics) {
    system.metrics.graphics.controllers.forEach((controller, index) => {
      let title = "GPU";
      let listEntry = [];

      if (system.metrics.graphics.controllers.length > 1) {
        title += " " + index;
      }

      getEntryList(listEntry, "Constructeur", controller.vendor);
      getEntryList(listEntry, "Modèle", controller.model);
      getEntryList(listEntry, "Driver", controller.driverVersion);

      if (controller.vram !== undefined && controller.vram !== null) {
        let subEntry = [];

        subEntry.push({
          label: "Utilisé",
          value: getUsage(controller.memoryUsed, controller.memoryTotal, "Mo") ?? 0,
          valueAppend: getValueUnit(controller.memoryUsed, "Mo"),
        });

        getEntryList(subEntry, "Total", controller.memoryTotal, "Mo", 2);

        listEntry.push({
          label: "VRAM",
          listEntry: subEntry,
        });
      }

      // Obligé de toujours afficher les entry du GPU car l'API ne retourne pas de valeur à 0
      listEntry.push({
        label: "Utilisation",
        value: formatValue({ value: controller.utilizationGpu ?? 0 }),
        valueAppend: "%",
      });
      listEntry.push({
        label: "Température",
        value: formatValue({ value: controller.temperatureGpu ?? 0 }),
        valueAppend: "°C",
      });
      listEntry.push({
        label: "Puissance",
        value: formatValue({ value: controller.powerDraw ?? 0 }),
        valueAppend: "W",
      });
      listEntry.push({
        label: "Horloge",
        value: formatValue({ value: controller.clockCore ?? 0 }),
        valueAppend: "Mhz",
      });
      listEntry.push({
        label: "Vitesse des ventilateurs",
        value: formatValue({ value: controller.fanSpeed ?? 0 }),
        valueAppend: "%",
      });

      list.push({
        label: title,
        listEntry,
        link: "https://systeminformation.io/graphics.html",
      });
    });
  }

  if (system.metrics.mem) {
    let listEntry = [];

    getEntryList(
      listEntry,
      "Utilisé",
      getUsage(system.metrics.mem.used, system.metrics.mem.total, "B"),
      getValueUnit(system.metrics.mem.used, "B")
    );
    getEntryList(listEntry, "Total", system.metrics.mem.total, "B", 2);

    list.push({
      label: "Mémoire",
      listEntry,
      link: "https://systeminformation.io/memory.html",
    });
  }

  listSummary.value = list;
}

function getEntryList(list, label, value, valueAppend, precision = 0) {
  if (value !== undefined && value !== null) {
    list.push({
      label,
      value: formatValue({
        value: value,
        unit: valueAppend,
        decimals: precision,
      }),
      valueAppend: getValueUnit(value, valueAppend),
    });
  }
}

function getUsage(used, total, unit) {
  let percent = Math.round((used / total) * 100);
  return (
    formatValue({
      value: used,
      unit: unit,
      decimals: 2,
    }) +
    " (" +
    percent +
    "%)"
  );
}

watch(system, () => {
  setSummary();
});
</script>

<template>
  <n-data-table
    :columns="columns"
    :data="listSummary"
    :render-cell="renderCell"
    children-key="listEntry"
    default-expand-all
    size="small" />
</template>

<style lang="sass" scoped>
.stat-card
  flex: 1
  min-width: 25em
</style>
