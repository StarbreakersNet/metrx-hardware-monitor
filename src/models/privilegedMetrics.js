/**
 * Ce que les droits administrateur apportent selon le système (« Paramètres > Zone de danger »).
 *
 * - `usefulness` : `useful` (métriques absentes autrement), `low` (gain discutable), `none`
 * - `switchable` : l'option peut être activée sur ce système
 * - `metrics` : métriques concernées (`settings.privileged.metrics.<key>`), avec un test de
 *   leur disponibilité dans les données actuelles
 */
export default {
  // powermetrics (voir src-sidecar/privileged.js)
  macos: {
    usefulness: "useful",
    switchable: true,
    metrics: [
      { key: "cpuClock", isAvailable: metrics => Boolean(metrics.cpuCurrentSpeed?.measured) },
      { key: "cpuPower", isAvailable: metrics => metrics.cpuPower?.draw != null },
      {
        key: "gpuClock",
        isAvailable: metrics => Boolean(metrics.gpu?.some(gpu => gpu.clockCore != null)),
      },
      {
        key: "gpuPower",
        isAvailable: metrics => Boolean(metrics.gpu?.some(gpu => gpu.powerDraw != null)),
      },
    ],
  },
  // Requête WMI MSAcpi_ThermalZoneTemperature : zone thermique ACPI, pas le capteur du CPU
  windows: {
    usefulness: "low",
    switchable: false,
    metrics: [
      { key: "cpuTemperature", isAvailable: metrics => metrics.cpuTemperature?.main != null },
    ],
  },
  // Températures (hwmon) et nvidia-smi sont lisibles sans root
  linux: {
    usefulness: "none",
    switchable: false,
    metrics: [],
  },
};
