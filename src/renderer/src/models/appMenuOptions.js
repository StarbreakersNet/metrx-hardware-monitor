export default version => {
  return [
    {
      label: "Accueil",
      key: "home",
      appIcon: "home-filled",
      hideHorizontalLabel: true,
    },
    {
      label: "Données",
      key: "nodes",
      appIcon: "table-filled",
      hideHorizontalLabel: true,
    },
    {
      label: "Sondes",
      key: "probes",
      appIcon: "device-heart-monitor-filled",
      hideHorizontalLabel: true,
    },
    {
      label: "Paramètres",
      key: "settings",
      appIcon: "settings-filled",
      hideHorizontalLabel: true,
    },
    {
      label: "Autres",
      key: "other",
      appIcon: "menu-2",
      hideHorizontalLabel: true,
      children: [
        {
          label: "À propos",
          key: "about",
        },
        {
          type: "group",
          label: version ?? "Version ?",
          key: "version",
          disabled: true,
        },
      ],
    },
  ];
};
