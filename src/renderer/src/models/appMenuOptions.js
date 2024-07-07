export default (version) => {
  return [
    {
      label: "Accueil",
      key: "home",
      fas: "home",
      hideHorizontalLabel: true,
    },
    {
      label: "Données",
      key: "nodes",
      fas: "table",
      hideHorizontalLabel: true,
    },
    {
      label: "Paramètres",
      key: "settings",
      fas: "gear",
      hideHorizontalLabel: true,
    },
    {
      label: "Autres",
      key: "other",
      fas: "bars",
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
