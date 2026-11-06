/** Sondes de données disponibles (`labelKey` : clé de traduction dans `probes.*`) */
export default [
  {
    labelKey: "probes.time",
    options: [
      { labelKey: "probes.currentTime", apiKey: "time", params: ["current"] },
      { labelKey: "probes.uptime", apiKey: "time", params: ["uptime"] },
      { labelKey: "probes.timezone", apiKey: "time", params: ["timezone"] },
      { labelKey: "probes.timezoneName", apiKey: "time", params: ["timezoneName"] },
    ],
  },
  {
    labelKey: "probes.cpu",
    options: [
      {
        labelKey: "probes.cpuUsage",
        apiKey: "currentLoad",
        params: ["currentLoad", "currentLoadIdle"],
      },
      { labelKey: "probes.cpuTemperature", apiKey: "cpuTemperature", params: ["*"] }, // Warning: Ne marche pas sans lancer en tant qu'admin
      { labelKey: "probes.cpuClock", apiKey: "cpuCurrentSpeed", params: ["*"] },
    ],
  },
  {
    labelKey: "probes.gpu",
    apiKey: "gpu",
    params: ["*"],
  },
  {
    labelKey: "probes.memory",
    apiKey: "mem",
    params: ["*"],
  },
];
