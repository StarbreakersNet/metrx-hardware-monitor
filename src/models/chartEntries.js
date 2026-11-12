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

/** Nom affiché d'un GPU : « GPU », ou « GPU 0 », « GPU 1 »… quand il y en a plusieurs */
export function getGpuDescription(index, count) {
  return count > 1 ? "GPU " + index : "GPU";
}

/**
 * Tuiles de l'accueil construites à partir des métriques. L'accueil, la fenêtre de fusion et la
 * page Sondes partagent cette liste.
 *
 * Chaque tuile d'une source collectée est listée, même quand la machine ne remonte pas sa valeur :
 * elle est alors `available: false` et s'affiche « Non disponible ». C'est l'utilisateur qui
 * choisit de la masquer (page Sondes), Metrx ne réinterprète pas ce que remonte systeminformation.
 *
 * L'id (ordre, fusions, masquage) repose sur la clé du titre (`charts.titles.*`) et la
 * description, et non sur le texte traduit : changer de langue ne fait pas perdre la
 * configuration des tuiles.
 *
 * `source` : fonction systeminformation qui fournit la valeur (sert à ne collecter que ce qui est
 * affiché). `group` : regroupement de la page Sondes (un groupe par GPU).
 */
export function getChartEntries(metrics) {
  const list = [];

  function add(entry) {
    const available = entry.value !== undefined && entry.value !== null;

    list.push({
      ...entry,
      id: (entry.titleKey + "#" + entry.description).toLowerCase(),
      available,
      value: available ? entry.value : null,
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
      source: "currentLoad",
      group: "cpu",
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
      source: "cpuCurrentSpeed",
      group: "cpu",
      value: gigahertzToHertz(metrics.cpuCurrentSpeed.avg),
    });
  }
  // Sans capteur accessible (ex. Windows sans droits administrateur), `main` vaut null
  if (metrics.cpuTemperature) {
    add({
      max: 100,
      min: 0,
      titleKey: "temperature",
      description: "CPU",
      icon: "temperature",
      unit: UNITS.CELSIUS,
      source: "cpuTemperature",
      group: "cpu",
      value: metrics.cpuTemperature.main,
    });
  }
  if (metrics.gpu?.length) {
    metrics.gpu.forEach((controller, index) => {
      const description = getGpuDescription(index, metrics.gpu.length);
      const gpu = {
        description,
        source: "gpu",
        group: "gpu#" + index,
        groupLabel: controller.model,
      };
      const memoryUsed = getGpuMetric(controller, "memoryUsed");
      const vram = controller.memoryTotal ?? controller.vram;

      add({
        ...gpu,
        max: 100,
        min: 0,
        titleKey: "usage",
        icon: "cpu2",
        unit: UNITS.PERCENT,
        value: getGpuMetric(controller, "utilizationGpu"),
      });
      // La taille de la VRAM est souvent connue sans son utilisation (GPU AMD, Intel)
      add({
        ...gpu,
        max: vram ? mebibytesToBytes(vram) : undefined,
        min: 0,
        titleKey: "vramUsage",
        icon: "section-filled",
        unit: UNITS.BYTES,
        value: mebibytesToBytes(memoryUsed),
      });
      add({
        ...gpu,
        max: 100,
        min: 0,
        titleKey: "temperature",
        icon: "temperature",
        unit: UNITS.CELSIUS,
        value: getGpuMetric(controller, "temperatureGpu"),
      });
      // Sans limite de puissance connue, l'échelle est automatique
      add({
        ...gpu,
        max: controller.powerLimit || undefined,
        min: 0,
        titleKey: "power",
        icon: "bolt-filled",
        unit: UNITS.WATT,
        value: getGpuMetric(controller, "powerDraw"),
      });
      add({
        ...gpu,
        max: megahertzToHertz(5000),
        min: 0,
        titleKey: "clock",
        icon: "wave-square",
        unit: UNITS.HERTZ,
        value: megahertzToHertz(getGpuMetric(controller, "clockCore")),
      });
      add({
        ...gpu,
        max: 100,
        min: 0,
        titleKey: "fanSpeed",
        icon: "windmill-filled",
        unit: UNITS.PERCENT,
        value: getGpuMetric(controller, "fanSpeed"),
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
      source: "mem",
      group: "ram",
      value: metrics.mem.used,
    });
  }

  return list;
}

/** Tuiles affichées sur l'accueil : toutes, sauf celles que l'utilisateur a masquées */
export function getVisibleEntries(entries, chartsHidden) {
  return entries.filter(entry => !chartsHidden?.[entry.id]);
}

/** Tuiles qu'on peut fusionner : affichées et dont la machine remonte la valeur */
export function getMergeableEntries(entries, chartsHidden) {
  return getVisibleEntries(entries, chartsHidden).filter(entry => entry.available);
}

/**
 * Fusions enregistrées limitées aux graphiques affichés (`chartsMerged` : id du graphique
 * principal → ids fusionnés dedans). Une fusion vers un graphique absent (masqué, non disponible,
 * autre machine, GPU retiré…) est ignorée : sinon les graphiques fusionnés dedans disparaîtraient.
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
