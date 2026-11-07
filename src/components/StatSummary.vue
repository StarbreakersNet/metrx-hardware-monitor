<script setup>
import { formatValue, getUnitLabel, getValueUnit, Loader } from "@/appUtils";
import { mebibytesToBytes, UNITS } from "@/models/units";
import { useSystemStore } from "@/stores/system";
import { NA, useLoadingBar } from "naive-ui";
import { computed, h, onMounted, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import LoaderSpinner from "@/components/LoaderSpinner.vue";

const system = useSystemStore();
const { t, locale } = useI18n();
const loaders = reactive({
  main: new Loader(),
});
const loading = computed(() => loaders.main.loading);
const loadingBar = useLoadingBar();

const listSummary = ref([]);
const columns = computed(() => [
  {
    title: t("stats.columns.name"),
    key: "label",
  },
  {
    title: t("stats.columns.value"),
    key: "value",
  },
  {
    title: t("stats.columns.unit"),
    key: "valueAppend",
  },
  {
    title: t("stats.columns.documentation"),
    key: "link",
  },
]);
const renderCell = (value, rowData, column) => {
  if (column.key === "link" && value) {
    return h(NA, { href: value, target: "_blank" }, { default: () => t("stats.seeDocumentation") });
  } else {
    return value;
  }
};

function setSummary() {
  let list = [];

  if (system.metrics.time) {
    let listEntry = [];

    const currentDate = new Date(system.metrics.time.current);

    getEntryList(listEntry, t("stats.hour"), currentDate.toLocaleTimeString(locale.value));
    getEntryList(listEntry, t("stats.date"), currentDate.toLocaleDateString(locale.value));

    list.push({
      label: t("stats.time"),
      listEntry,
      link: "https://systeminformation.io/general.html",
    });
    loaders.main.stop();
    loadingBar.finish();
  }

  if (system.metrics.currentLoad || system.info.cpu) {
    let listEntry = [];

    getEntryList(listEntry, t("stats.manufacturer"), system.info.cpu?.manufacturer);
    getEntryList(listEntry, t("stats.model"), system.info.cpu?.brand);
    getEntryList(listEntry, t("stats.cores"), system.info.cpu?.physicalCores);
    getEntryList(listEntry, t("stats.logicalProcessors"), system.info.cpu?.cores);
    getEntryList(listEntry, t("stats.socket"), system.info.cpu?.socket);
    getEntryList(
      listEntry,
      t("stats.usage"),
      system.metrics.currentLoad?.currentLoad,
      UNITS.PERCENT
    );
    getEntryList(
      listEntry,
      t("stats.temperature"),
      system.metrics.cpuTemperature?.main,
      UNITS.CELSIUS
    );
    getEntryList(
      listEntry,
      t("stats.clock"),
      system.metrics.cpuCurrentSpeed?.avg,
      UNITS.GIGAHERTZ,
      2
    );
    getEntryList(
      listEntry,
      t("stats.virtualization"),
      system.info.cpu?.virtualization ? t("stats.enabled") : t("stats.disabled")
    );

    list.push({
      label: t("stats.cpu"),
      listEntry,
      link: "https://systeminformation.io/cpu.html",
    });
  }

  if (system.metrics.gpu?.length) {
    system.metrics.gpu.forEach((controller, index) => {
      let title = t("stats.gpu");
      let listEntry = [];

      if (system.metrics.gpu.length > 1) {
        title += " " + index;
      }

      getEntryList(listEntry, t("stats.manufacturer"), controller.vendor);
      getEntryList(listEntry, t("stats.model"), controller.model);
      getEntryList(listEntry, t("stats.driver"), controller.driverVersion);

      if (controller.vram !== undefined && controller.vram !== null) {
        let subEntry = [];

        const memoryUsed = mebibytesToBytes(controller.memoryUsed);
        const memoryTotal = mebibytesToBytes(controller.memoryTotal);

        subEntry.push({
          label: t("stats.used"),
          value: getUsage(memoryUsed, memoryTotal, UNITS.BYTES) ?? 0,
          valueAppend: getValueUnit(memoryUsed, UNITS.BYTES),
        });

        getEntryList(subEntry, t("stats.total"), memoryTotal, UNITS.BYTES, 2);

        listEntry.push({
          label: t("stats.vram"),
          listEntry: subEntry,
        });
      }

      // Obligé de toujours afficher les entry du GPU car l'API ne retourne pas de valeur à 0
      listEntry.push({
        label: t("stats.usage"),
        value: formatValue({ value: controller.utilizationGpu ?? 0 }),
        valueAppend: getUnitLabel(UNITS.PERCENT),
      });
      listEntry.push({
        label: t("stats.temperature"),
        value: formatValue({ value: controller.temperatureGpu ?? 0 }),
        valueAppend: getUnitLabel(UNITS.CELSIUS),
      });
      listEntry.push({
        label: t("stats.power"),
        value: formatValue({ value: controller.powerDraw ?? 0 }),
        valueAppend: getUnitLabel(UNITS.WATT),
      });
      listEntry.push({
        label: t("stats.clock"),
        value: formatValue({ value: controller.clockCore ?? 0 }),
        valueAppend: getUnitLabel(UNITS.MEGAHERTZ),
      });
      listEntry.push({
        label: t("stats.fanSpeed"),
        value: formatValue({ value: controller.fanSpeed ?? 0 }),
        valueAppend: getUnitLabel(UNITS.PERCENT),
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
      t("stats.used"),
      getUsage(system.metrics.mem.used, system.metrics.mem.total, UNITS.BYTES),
      getValueUnit(system.metrics.mem.used, UNITS.BYTES)
    );
    getEntryList(listEntry, t("stats.total"), system.metrics.mem.total, UNITS.BYTES, 2);

    list.push({
      label: t("stats.memory"),
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
        precision,
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
      precision: 2,
    }) +
    " (" +
    percent +
    "%)"
  );
}

onMounted(() => {
  loadingBar.start();
  loaders.main.start();
  watch(system, () => {
    setSummary();
  });
});
</script>

<template>
  <n-data-table
    :columns="columns"
    :data="listSummary"
    :loading="loading"
    :render-cell="renderCell"
    :row-key="row => row.label"
    children-key="listEntry"
    default-expand-all
    size="small">
    <template #loading>
      <loader-spinner />
    </template>
  </n-data-table>
</template>

<style lang="sass" scoped>
.stat-card
  flex: 1
  min-width: 25em
</style>
