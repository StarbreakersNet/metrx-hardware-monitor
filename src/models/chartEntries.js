import { gigahertzToHertz, mebibytesToBytes, megahertzToHertz, UNITS } from "@/models/units";

/**
 * GPU lu par nvidia-smi. systeminformation ne recopie ses valeurs que si elles sont non nulles
 * (`if (nvidia.fanSpeed)` dans common/nvidia.js) : une valeur absente y vaut donc 0.
 */
function isReadByNvidiaSmi(controller) {
  return /nvidia/i.test(controller.vendor ?? "") && controller.memoryTotal != null;
}

/**
 * Valeur dynamique d'un GPU (utilisation, température, horloge, ventilateur…), ou `undefined`
 * quand le GPU ne la fournit pas : Apple, AMD et Intel ne remontent pas tout, et afficher 0
 * ferait croire à une vraie mesure.
 */
export function getGpuMetric(controller, key) {
  const value = controller[key];

  if (value !== undefined && value !== null) {
    return value;
  }

  return isReadByNvidiaSmi(controller) ? 0 : undefined;
}

/**
 * Graphiques de l'accueil construits à partir des métriques. GraphSummary et la fenêtre de
 * fusion partagent cette liste : la fenêtre ne propose que des graphiques réellement affichés.
 *
 * L'id (ordre, fusions) repose sur la clé du titre (`charts.titles.*`) et la description, et non
 * sur le texte traduit : changer de langue ne fait pas perdre la configuration des graphiques.
 *
 * `nominalCpuClock` : la fréquence CPU remontée est la fréquence nominale, figée (macOS, où Node
 * lit `hw.cpufrequency`) ; son graphique serait une ligne plate, il n'est pas affiché, sauf si
 * la fréquence réelle est mesurée (`measured`, métriques avancées avec powermetrics).
 */
export function getChartEntries(metrics, { nominalCpuClock = false } = {}) {
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
  const measuredCpuClock = Boolean(metrics.cpuCurrentSpeed?.measured);

  if (metrics.cpuCurrentSpeed && (!nominalCpuClock || measuredCpuClock)) {
    add({
      // Mesurée, la fréquence max change à chaque relevé : échelle automatique
      max: measuredCpuClock ? undefined : gigahertzToHertz(metrics.cpuCurrentSpeed.max),
      min: 0,
      titleKey: "clock",
      description: "CPU",
      icon: "wave-square",
      unit: UNITS.HERTZ,
      value: gigahertzToHertz(metrics.cpuCurrentSpeed.avg),
    });
  }
  // Sans capteur accessible (ex. Windows sans droits administrateur), `main` vaut null
  if (metrics.cpuTemperature?.main != null) {
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
  // Puissance du CPU : métriques avancées seulement (powermetrics, absent de systeminformation)
  if (metrics.cpuPower?.draw != null) {
    add({
      min: 0,
      titleKey: "power",
      description: "CPU",
      icon: "bolt-filled",
      unit: UNITS.WATT,
      value: metrics.cpuPower.draw,
    });
  }
  if (metrics.gpu?.length) {
    metrics.gpu.forEach((controller, index) => {
      let description = "GPU";

      if (metrics.gpu.length > 1) {
        description += " " + index;
      }

      const usage = getGpuMetric(controller, "utilizationGpu");
      const temperature = getGpuMetric(controller, "temperatureGpu");
      const powerDraw = getGpuMetric(controller, "powerDraw");
      const clock = getGpuMetric(controller, "clockCore");
      const fanSpeed = getGpuMetric(controller, "fanSpeed");
      const memoryUsed = getGpuMetric(controller, "memoryUsed");

      if (usage !== undefined) {
        add({
          max: 100,
          min: 0,
          titleKey: "usage",
          description,
          icon: "cpu2",
          unit: UNITS.PERCENT,
          value: usage,
        });
      }

      // La taille de la VRAM est souvent connue sans son utilisation (GPU AMD, Intel)
      if (controller.vram && memoryUsed !== undefined) {
        add({
          max: mebibytesToBytes(controller.vram),
          min: 0,
          titleKey: "vramUsage",
          description,
          icon: "section-filled",
          unit: UNITS.BYTES,
          value: mebibytesToBytes(memoryUsed),
        });
      }

      if (temperature !== undefined) {
        add({
          max: 100,
          min: 0,
          titleKey: "temperature",
          description,
          icon: "temperature",
          unit: UNITS.CELSIUS,
          value: temperature,
        });
      }

      // NVIDIA : la limite est connue, la consommation peut valoir 0 (absente). GPU Apple :
      // consommation mesurée par powermetrics, sans limite (échelle automatique).
      if (controller.powerLimit || controller.powerDraw != null) {
        add({
          max: controller.powerLimit || undefined,
          min: 0,
          titleKey: "power",
          description,
          icon: "bolt-filled",
          unit: UNITS.WATT,
          value: powerDraw ?? 0,
        });
      }

      if (clock !== undefined) {
        add({
          max: megahertzToHertz(5000),
          min: 0,
          titleKey: "clock",
          description,
          icon: "wave-square",
          unit: UNITS.HERTZ,
          value: megahertzToHertz(clock),
        });
      }

      if (fanSpeed !== undefined) {
        add({
          max: 100,
          min: 0,
          titleKey: "fanSpeed",
          description,
          icon: "windmill-filled",
          unit: UNITS.PERCENT,
          value: fanSpeed,
        });
      }
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
