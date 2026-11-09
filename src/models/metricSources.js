import { currentPlatform } from "@/api/app";
import { formatBytes, formatHertz } from "@/appUtils";
import { i18n } from "@/i18n";
import { getGpuDescription } from "@/models/chartEntries";

/**
 * Données remontées par systeminformation, telles que la page Données les affiche.
 *
 * Chaque source correspond à une fonction de la lib (`si.cpu()`, `si.mem()`…). Ses champs connus
 * sont listés dans l'ordre d'affichage, avec leur format ; un champ que la lib ne renvoie pas
 * s'affiche « Non remonté ». Les champs que la lib renvoie sans être listés ici sont ajoutés à la
 * fin, pour tout montrer. Libellés : `stats.fields.<source>.<champ>` (points remplacés par `_`).
 */

const DOC = {
  cpu: "https://systeminformation.io/cpu.html",
  gpu: "https://systeminformation.io/graphics.html",
  mem: "https://systeminformation.io/memory.html",
  time: "https://systeminformation.io/general.html",
};

const field = (key, format = "text") => ({ key, format });

export const COMPONENTS = ["cpu", "gpu", "mem", "time"];

export const STAT_SOURCES = [
  {
    key: "cpu",
    component: "cpu",
    icon: "cpu",
    doc: DOC.cpu,
    figure: { key: "brand", sub: ["physicalCores", "performanceCores", "efficiencyCores"] },
    fields: [
      field("manufacturer"),
      field("brand"),
      field("vendor"),
      field("family"),
      field("model"),
      field("stepping"),
      field("revision"),
      field("voltage"),
      field("speed", "gigahertz"),
      field("speedMin", "gigahertz"),
      field("speedMax", "gigahertz"),
      field("governor"),
      field("cores", "count"),
      field("physicalCores", "count"),
      field("performanceCores", "count"),
      field("efficiencyCores", "count"),
      field("processors", "count"),
      field("socket"),
      field("flags", "list"),
      field("virtualization", "boolean"),
      field("cache.l1d", "bytes"),
      field("cache.l1i", "bytes"),
      field("cache.l2", "bytes"),
      field("cache.l3", "bytes"),
    ],
  },
  {
    key: "currentLoad",
    component: "cpu",
    icon: "gauge",
    doc: DOC.cpu,
    figure: {
      key: "currentLoad",
      progress: data => data.currentLoad,
      sub: ["currentLoadUser", "currentLoadSystem", "currentLoadIdle"],
    },
    bars: { key: "cpus", pick: core => core?.load, format: "percent", max: 100 },
    fields: [
      field("currentLoad", "percent"),
      field("currentLoadUser", "percent"),
      field("currentLoadSystem", "percent"),
      field("currentLoadIdle", "percent"),
      field("currentLoadNice", "percent"),
      field("currentLoadIowait", "percent"),
      field("currentLoadIrq", "percent"),
      field("currentLoadSteal", "percent"),
      field("currentLoadGuest", "percent"),
      field("avgLoad", "number"),
      field("rawCurrentLoad", "count"),
      field("rawCurrentLoadIdle", "count"),
    ],
  },
  {
    key: "cpuTemperature",
    component: "cpu",
    icon: "temperature",
    doc: DOC.cpu,
    figure: { key: "main", sub: ["max", "chipset"] },
    bars: { key: "cores", pick: value => value, format: "celsius", max: 100, warn: 80 },
    fields: [
      field("main", "celsius"),
      field("max", "celsius"),
      field("chipset", "celsius"),
      field("socket", "celsiusList"),
    ],
  },
  {
    key: "cpuCurrentSpeed",
    component: "cpu",
    icon: "wave-square",
    doc: DOC.cpu,
    figure: { key: "avg", sub: ["min", "max"] },
    bars: { key: "cores", pick: value => value, format: "gigahertz" },
    fields: [field("avg", "gigahertz"), field("min", "gigahertz"), field("max", "gigahertz")],
  },
  {
    key: "gpu",
    component: "gpu",
    icon: "cpu2",
    doc: DOC.gpu,
    perItem: true,
    figure: {
      key: "utilizationGpu",
      progress: data => data.utilizationGpu,
      sub: ["temperatureGpu", "cores"],
    },
    fields: [
      field("vendor"),
      field("model"),
      field("bus"),
      field("vendorId"),
      field("deviceId"),
      field("subDeviceId"),
      field("driverVersion"),
      field("cores", "count"),
      field("metalVersion"),
      field("external", "boolean"),
      field("vramDynamic", "boolean"),
      field("vram", "mebibytes"),
      field("utilizationGpu", "percent"),
      field("utilizationMemory", "percent"),
      field("temperatureGpu", "celsius"),
      field("temperatureMemory", "celsius"),
      field("memoryTotal", "mebibytes"),
      field("memoryUsed", "mebibytes"),
      field("memoryFree", "mebibytes"),
      field("clockCore", "megahertz"),
      field("clockMemory", "megahertz"),
      field("powerDraw", "watt"),
      field("powerLimit", "watt"),
      field("fanSpeed", "percent"),
    ],
  },
  {
    key: "mem",
    component: "mem",
    icon: "section-filled",
    doc: DOC.mem,
    figure: {
      key: "used",
      progress: data => (data.total ? (data.used / data.total) * 100 : undefined),
      sub: ["available", "swapused"],
    },
    fields: [
      field("total", "bytes"),
      field("used", "bytes"),
      field("active", "bytes"),
      field("available", "bytes"),
      field("free", "bytes"),
      field("buffcache", "bytes"),
      field("reclaimable", "bytes"),
      field("buffers", "bytes"),
      field("cached", "bytes"),
      field("slab", "bytes"),
      field("writeback", "bytes"),
      field("dirty", "bytes"),
      field("swaptotal", "bytes"),
      field("swapused", "bytes"),
      field("swapfree", "bytes"),
    ],
  },
  {
    key: "time",
    component: "time",
    icon: "clock",
    doc: DOC.time,
    figure: { key: "current", format: "hour", sub: ["timezoneName"] },
    fields: [
      field("current", "date"),
      field("uptime", "duration"),
      field("timezone"),
      field("timezoneName"),
    ],
  },
];

/** Champs à demander au sidecar pour chaque source (`si.get`) */
export const SOURCE_PARAMS = {
  currentLoad: "*",
  cpuTemperature: "*",
  cpuCurrentSpeed: "*",
  gpu: "*",
  mem: "*",
  // si.time() est synchrone : `*` n'est pas pris en charge par si.get pour elle
  time: "current, uptime, timezone, timezoneName",
};

const t = (...args) => i18n.global.t(...args);
const te = key => i18n.global.te(key);

function toLocaleNumber(value, digits) {
  return Number(value).toLocaleString(i18n.global.locale.value, {
    maximumFractionDigits: digits,
  });
}

export function isMissing(value) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (typeof value === "number" && Number.isNaN(value)) ||
    (Array.isArray(value) && value.length === 0)
  );
}

function scaled({ value, unit }) {
  return { number: toLocaleNumber(value, 2), unit };
}

/** Valeur formatée séparée de son unité : `{ number: "2,4", unit: "GHz" }` */
export function formatField(value, format) {
  switch (format) {
    case "percent":
      return { number: toLocaleNumber(value, 1), unit: "%" };
    case "celsius":
      return { number: toLocaleNumber(value, 2), unit: "°C" };
    case "celsiusList":
      return { number: value.map(item => toLocaleNumber(item, 2)).join(" · "), unit: "°C" };
    case "watt":
      return { number: toLocaleNumber(value, 2), unit: "W" };
    case "gigahertz":
      return scaled(formatHertz(value * 1e9));
    case "megahertz":
      return scaled(formatHertz(value * 1e6));
    case "bytes":
      return scaled(formatBytes(value));
    case "mebibytes":
      return scaled(formatBytes(value * 1024 * 1024));
    case "count":
      return { number: toLocaleNumber(value, 0), unit: "" };
    case "number":
      return { number: toLocaleNumber(value, 2), unit: "" };
    case "boolean":
      return { number: value ? t("stats.yes") : t("stats.no"), unit: "" };
    case "date":
      return { number: new Date(value).toLocaleString(i18n.global.locale.value), unit: "" };
    case "hour":
      return { number: new Date(value).toLocaleTimeString(i18n.global.locale.value), unit: "" };
    case "day":
      return { number: new Date(value).toLocaleDateString(i18n.global.locale.value), unit: "" };
    case "duration":
      return { number: formatDuration(value), unit: "" };
    default:
      return { number: Array.isArray(value) ? value.join(", ") : String(value), unit: "" };
  }
}

function formatDuration(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return t("stats.duration", { days, hours, minutes });
}

function guessFormat(value) {
  if (typeof value === "boolean") {
    return "boolean";
  }
  return typeof value === "number" ? "number" : "text";
}

function getPath(data, key) {
  return key.split(".").reduce((value, part) => value?.[part], data);
}

function fieldLabel(sourceKey, key) {
  const labelKey = `stats.fields.${sourceKey}.${key.replaceAll(".", "_")}`;

  return te(labelKey) ? t(labelKey) : key;
}

/**
 * Ligne affichée : `value` est le texte complet (« 2,4 GHz »), `number` et `unit` servent aux
 * colonnes séparées du tableau. `missing` : la lib ne remonte pas cette valeur.
 */
export function makeRow({ id, label, key, value, format, note, percent }) {
  const missing = isMissing(value);
  const formatted = missing ? { number: "", unit: "" } : formatField(value, format);

  return {
    id,
    label,
    key,
    missing,
    number: formatted.number,
    unit: formatted.unit,
    value: missing ? "" : [formatted.number, formatted.unit].filter(Boolean).join(" "),
    note: note ?? "",
    percent: missing ? undefined : percent,
  };
}

function getNote(sourceKey, key, data) {
  if (
    sourceKey === "cpuCurrentSpeed" &&
    key === "avg" &&
    currentPlatform === "macos" &&
    !data?.measured
  ) {
    return t("stats.notes.nominalClock");
  }
  if (sourceKey === "gpu" && key === "utilizationGpu" && data?.vendor === "Apple") {
    return t("stats.notes.ioreg");
  }
  return "";
}

/** Champs connus puis champs supplémentaires renvoyés par la lib (tableaux et objets exclus) */
function getFields(source, data) {
  const known = new Set(source.fields.map(item => item.key.split(".")[0]));
  const ignored = new Set([source.bars?.key, "measured"]);
  const extra = Object.entries(data ?? {})
    .filter(([key]) => !known.has(key) && !ignored.has(key))
    .filter(([, value]) => value === null || typeof value !== "object")
    .map(([key, value]) => field(key, guessFormat(value)));

  return [...source.fields, ...extra];
}

function getSourceItems(source, metrics, info) {
  const data = source.key === "cpu" ? info.cpu : metrics[source.key];

  if (!data) {
    return [];
  }
  if (source.perItem) {
    return data.map((item, index) => ({
      data: item,
      suffix: getGpuDescription(index, data.length),
      index,
    }));
  }
  return [{ data, suffix: "", index: 0 }];
}

/** Sections de la vue détaillée et du tableau : une par source (et par GPU) */
export function getStatSections(metrics, info) {
  const sections = [];

  STAT_SOURCES.forEach(source => {
    getSourceItems(source, metrics, info).forEach(({ data, suffix, index }) => {
      const id = source.key + (source.perItem ? "#" + index : "");
      const rows = getFields(source, data).map(item => {
        const value = getPath(data, item.key);
        const percent = item.format === "percent" ? value : undefined;

        return makeRow({
          id: id + "." + item.key,
          label: fieldLabel(source.key, item.key),
          key: item.key,
          value,
          format: item.format,
          note: getNote(source.key, item.key, data),
          percent,
        });
      });

      sections.push({
        id,
        component: source.component,
        icon: source.icon,
        doc: source.doc,
        fn: `si.${source.key}()`,
        title: t(`stats.sources.${source.key}`) + (suffix ? " · " + (data.model || suffix) : ""),
        figure: getFigure(source, data),
        bars: getBars(source, data),
        rows,
      });
    });
  });

  return sections;
}

function getFigure(source, data) {
  const { key, sub = [], progress, format } = source.figure;
  const main = source.fields.find(item => item.key === key);
  const row = makeRow({
    id: key,
    label: "",
    key,
    value: data[key],
    format: format ?? main?.format,
  });
  const details = sub
    .map(subKey => {
      const subField = source.fields.find(item => item.key === subKey);
      const value = data[subKey];

      if (isMissing(value)) {
        return null;
      }

      const { number, unit } = formatField(value, subField?.format);

      return [fieldLabel(source.key, subKey), number, unit].filter(Boolean).join(" ");
    })
    .filter(Boolean);
  const percent = progress?.(data);

  return {
    value: row.missing ? null : row.value,
    details: details.join(" · "),
    percent: isMissing(percent) ? undefined : Math.min(100, Math.max(0, percent)),
    note: getNote(source.key, key, data),
  };
}

function getBars(source, data) {
  if (!source.bars) {
    return null;
  }

  const values = (data[source.bars.key] ?? []).map(source.bars.pick);

  if (!values.length || values.every(isMissing)) {
    return null;
  }

  const max = source.bars.max ?? Math.max(...values.filter(value => !isMissing(value)));

  return {
    title: t(`stats.bars.${source.key}`),
    max,
    warn: source.bars.warn,
    values: values.map((value, index) => ({
      index,
      value,
      percent: isMissing(value) || !max ? 0 : (value / max) * 100,
      label: isMissing(value)
        ? t("stats.notReported")
        : formatField(value, source.bars.format).number +
          " " +
          formatField(value, source.bars.format).unit,
    })),
  };
}

/**
 * Synthèse : l'essentiel de chaque composant, toutes sources confondues, comme l'ancien tableau.
 * `bar` : pourcentage affiché en jauge.
 */
export function getStatSummary(metrics, info) {
  const groups = [];
  const cpu = info.cpu ?? {};
  const load = metrics.currentLoad;
  const temperature = metrics.cpuTemperature;
  const speed = metrics.cpuCurrentSpeed;

  if (load || temperature || speed || info.cpu) {
    const cores =
      cpu.performanceCores && cpu.efficiencyCores
        ? t("stats.summary.coresDetail", {
            count: cpu.physicalCores,
            performance: cpu.performanceCores,
            efficiency: cpu.efficiencyCores,
          })
        : cpu.physicalCores;

    groups.push({
      id: "cpu",
      component: "cpu",
      icon: "cpu",
      title: t("stats.components.cpu"),
      sources: "cpu · currentLoad · cpuTemperature · cpuCurrentSpeed",
      rows: [
        summaryRow(
          "cpu.brand",
          "stats.summary.model",
          [cpu.manufacturer, cpu.brand].filter(Boolean).join(" ")
        ),
        summaryRow("cpu.physicalCores", "stats.summary.cores", cores, "text"),
        summaryRow("cpu.cores", "stats.summary.logicalProcessors", cpu.cores, "count"),
        summaryRow("cpu.socket", "stats.summary.socket", cpu.socket),
        summaryRow("currentLoad.currentLoad", "stats.summary.usage", load?.currentLoad, "percent", {
          percent: load?.currentLoad,
        }),
        summaryRow(
          "cpuTemperature.main",
          "stats.summary.temperature",
          temperature?.main,
          "celsius",
          {
            percent: temperature?.main,
          }
        ),
        summaryRow("cpuCurrentSpeed.avg", "stats.summary.clock", speed?.avg, "gigahertz", {
          note: getNote("cpuCurrentSpeed", "avg", speed),
        }),
        ...(metrics.cpuPower !== undefined
          ? [summaryRow("cpuPower.draw", "stats.summary.power", metrics.cpuPower?.draw, "watt")]
          : []),
        summaryRow(
          "cpu.virtualization",
          "stats.summary.virtualization",
          info.cpu?.virtualization,
          "boolean"
        ),
      ],
    });
  }

  (metrics.gpu ?? []).forEach((controller, index) => {
    const description = getGpuDescription(index, metrics.gpu.length);
    const vram = controller.memoryTotal ?? controller.vram;

    groups.push({
      id: "gpu#" + index,
      component: "gpu",
      icon: "cpu2",
      title: description + (controller.model ? " · " + controller.model : ""),
      sources: metrics.gpu.length > 1 ? `gpu.controllers[${index}]` : "gpu.controllers[0]",
      detailsId: "gpu#" + index,
      rows: [
        summaryRow("vendor", "stats.summary.manufacturer", controller.vendor),
        summaryRow("model", "stats.summary.model", controller.model),
        summaryRow("driverVersion", "stats.summary.driver", controller.driverVersion),
        summaryRow("utilizationGpu", "stats.summary.usage", controller.utilizationGpu, "percent", {
          percent: controller.utilizationGpu,
          note: getNote("gpu", "utilizationGpu", controller),
        }),
        summaryRow(
          "temperatureGpu",
          "stats.summary.temperature",
          controller.temperatureGpu,
          "celsius",
          {
            percent: controller.temperatureGpu,
          }
        ),
        summaryRow("vram", "stats.summary.vram", vram, "mebibytes"),
        summaryRow("memoryUsed", "stats.summary.vramUsed", controller.memoryUsed, "mebibytes", {
          percent: vram ? (controller.memoryUsed / vram) * 100 : undefined,
        }),
        summaryRow("clockCore", "stats.summary.clock", controller.clockCore, "megahertz"),
        summaryRow("powerDraw", "stats.summary.power", controller.powerDraw, "watt"),
        summaryRow("fanSpeed", "stats.summary.fanSpeed", controller.fanSpeed, "percent"),
      ],
    });
  });

  if (metrics.mem) {
    const mem = metrics.mem;
    const usedPercent = mem.total ? (mem.used / mem.total) * 100 : undefined;
    const swap = mem.swaptotal
      ? formatField(mem.swapused, "bytes").number +
        " " +
        formatField(mem.swapused, "bytes").unit +
        " / " +
        formatField(mem.swaptotal, "bytes").number +
        " " +
        formatField(mem.swaptotal, "bytes").unit
      : mem.swaptotal;

    groups.push({
      id: "mem",
      component: "mem",
      icon: "section-filled",
      title: t("stats.components.mem"),
      sources: "mem",
      rows: [
        summaryRow("used", "stats.summary.used", mem.used, "bytes", {
          percent: usedPercent,
          suffix: usedPercent !== undefined ? ` (${toLocaleNumber(usedPercent, 1)} %)` : "",
          warn: usedPercent >= 90,
        }),
        summaryRow("total", "stats.summary.total", mem.total, "bytes"),
        summaryRow("available", "stats.summary.available", mem.available, "bytes"),
        summaryRow(
          "swapused",
          "stats.summary.swap",
          swap,
          typeof swap === "string" ? "text" : "bytes",
          {
            percent: mem.swaptotal ? (mem.swapused / mem.swaptotal) * 100 : undefined,
          }
        ),
      ],
    });
  }

  if (metrics.time) {
    const time = metrics.time;

    groups.push({
      id: "time",
      component: "time",
      icon: "clock",
      title: t("stats.components.time"),
      sources: "time",
      rows: [
        summaryRow("current", "stats.summary.hour", time.current, "hour"),
        summaryRow("current", "stats.summary.date", time.current, "day", { id: "date" }),
        summaryRow("uptime", "stats.summary.uptime", time.uptime, "duration"),
        summaryRow("timezoneName", "stats.summary.timezone", time.timezoneName),
      ],
    });
  }

  return groups;
}

function summaryRow(key, labelKey, value, format = "text", options = {}) {
  const row = makeRow({
    id: options.id ?? key,
    label: t(labelKey),
    key,
    value,
    format,
    note: options.note,
    percent: options.percent,
  });

  if (!row.missing && options.suffix) {
    row.value += options.suffix;
  }
  row.percent = isMissing(row.percent) ? undefined : Math.min(100, Math.max(0, row.percent));
  row.warn = Boolean(options.warn);

  return row;
}
