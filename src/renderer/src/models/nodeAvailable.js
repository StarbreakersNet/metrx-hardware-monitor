export default [
  {
    label: "Temps",
    options: [
      { label: "Heure locale", apiKey: "time", params: ["current"] },
      { label: "Allumé depuis", apiKey: "time", params: ["uptime"] },
      { label: "Fuseau", apiKey: "time", params: ["timezone"] },
      { label: "Nom du fuseau", apiKey: "time", params: ["timezoneName"] },
    ],
  },
  {
    label: "CPU",
    options: [
      { label: "Utilisation", apiKey: "currentLoad", params: ["currentLoad", "currentLoadIdle"] },
      { label: "Température", apiKey: "cpuTemperature", params: ["*"] }, // Warning: Ne marche pas sans lancer en tant qu'admin
      { label: "Horloge", apiKey: "cpuCurrentSpeed", params: ["*"] },
    ],
  },
  {
    label: "GPU",
    apiKey: "graphics",
    params: ["*"],
  },
  {
    label: "Mémoire",
    apiKey: "mem",
    params: ["*"],
  },
];
