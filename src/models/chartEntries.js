import { gigahertzToHertz, mebibytesToBytes, megahertzToHertz, UNITS } from "@/models/units";

/**
 * Graphiques de l'accueil construits à partir des métriques. GraphSummary et la fenêtre de
 * fusion partagent cette liste : la fenêtre ne propose que des graphiques réellement affichés.
 *
 * L'id (ordre, fusions) repose sur la clé du titre (`charts.titles.*`) et la description, et non
 * sur le texte traduit : changer de langue ne fait pas perdre la configuration des graphiques.
 */
export function getChartEntries(metrics) {
  const list = [];

  function add(entry) {
    list.push({
      ...entry,
      id: (entry.titleKey + "#" + entry.description).toLowerCase(),
      value: entry.value ?? 0,
    });
  }

  if (metrics.currentLoad) {
    add({
      max: 100,
      min: 0,
      titleKey: "usage",
      description: "CPU",
      icon: "cpu",
      unit: UNITS.PERCENT,
      value: metrics.currentLoad.currentLoad,
    });
  }
  if (metrics.cpuCurrentSpeed) {
    add({
      max: gigahertzToHertz(metrics.cpuCurrentSpeed.max),
      min: 0,
      titleKey: "clock",
      description: "CPU",
      icon: "wave-square",
      unit: UNITS.HERTZ,
      value: gigahertzToHertz(metrics.cpuCurrentSpeed.avg),
    });
  }
  if (metrics.cpuTemperature) {
    add({
      max: 100,
      min: 0,
      titleKey: "temperature",
      description: "CPU",
      icon: "temperature",
      unit: UNITS.CELSIUS,
      value: metrics.cpuTemperature.main,
    });
  }
  if (metrics.gpu?.length) {
    metrics.gpu.forEach((controller, index) => {
      let description = "GPU";

      if (metrics.gpu.length > 1) {
        description += " " + index;
      }

      add({
        max: 100,
        min: 0,
        titleKey: "usage",
        description,
        icon: "cpu2",
        unit: UNITS.PERCENT,
        value: controller.utilizationGpu,
      });

      if (controller.vram) {
        add({
          max: mebibytesToBytes(controller.vram),
          min: 0,
          titleKey: "vramUsage",
          description,
          icon: "section-filled",
          unit: UNITS.BYTES,
          value: mebibytesToBytes(controller.memoryUsed),
        });
      }

      add({
        max: 100,
        min: 0,
        titleKey: "temperature",
        description,
        icon: "temperature",
        unit: UNITS.CELSIUS,
        value: controller.temperatureGpu,
      });

      if (controller.powerLimit) {
        add({
          max: controller.powerLimit,
          min: 0,
          titleKey: "power",
          description,
          icon: "bolt-filled",
          unit: UNITS.WATT,
          value: controller.powerDraw,
        });
      }

      add({
        max: megahertzToHertz(5000),
        min: 0,
        titleKey: "clock",
        description,
        icon: "wave-square",
        unit: UNITS.HERTZ,
        value: megahertzToHertz(controller.clockCore),
      });

      add({
        max: 100,
        min: 0,
        titleKey: "fanSpeed",
        description,
        icon: "windmill-filled",
        unit: UNITS.PERCENT,
        value: controller.fanSpeed,
      });
    });
  }
  if (metrics.mem) {
    add({
      max: metrics.mem.total,
      min: 0,
      titleKey: "usage",
      description: "RAM",
      icon: "section-filled",
      unit: UNITS.BYTES,
      value: metrics.mem.used,
    });
  }

  return list;
}

/**
 * Fusions enregistrées limitées aux graphiques affichés (`chartsMerged` : id du graphique
 * principal → ids fusionnés dedans). Une fusion vers un graphique absent (GPU sans VRAM, autre
 * machine, GPU retiré…) est ignorée : sinon les graphiques fusionnés dedans disparaîtraient.
 * Les graphiques d'une autre unité sont ignorés aussi.
 */
export function getActiveMerges(chartsMerged, entries) {
  const units = new Map(entries.map(entry => [entry.id, entry.unit]));
  const merges = {};

  Object.entries(chartsMerged ?? {}).forEach(([graphId, mergedIds]) => {
    const unit = units.get(graphId);
    const presentIds = (mergedIds ?? []).filter(
      id => id !== graphId && units.has(id) && units.get(id) === unit
    );

    if (units.has(graphId) && presentIds.length) {
      merges[graphId] = presentIds;
    }
  });

  return merges;
}
