export default (version) => {
  return [
    {
      label: "Accueil",
      key: "home",
      fas: "home",
    },
    {
      label: "Données",
      key: "nodes",
      fas: "table",
    },
    {
      label: "Paramètres",
      key: "settings",
      fas: "gear",
    },
    {
      label: "Autres",
      key: "other",
      fas: "ellipsis-vertical",
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
