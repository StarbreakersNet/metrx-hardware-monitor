/** Options du menu principal (libellés traduits avec `t` de vue-i18n) */
export default (version, t) => {
  return [
    {
      label: t("menu.home"),
      key: "home",
      appIcon: "home-filled",
      hideHorizontalLabel: true,
    },
    {
      label: t("menu.nodes"),
      key: "nodes",
      appIcon: "table-filled",
      hideHorizontalLabel: true,
    },
    {
      label: t("menu.probes"),
      key: "probes",
      appIcon: "device-heart-monitor-filled",
      hideHorizontalLabel: true,
    },
    {
      label: t("menu.settings"),
      key: "settings",
      appIcon: "settings-filled",
      hideHorizontalLabel: true,
    },
    {
      label: t("menu.other"),
      key: "other",
      appIcon: "menu-2",
      hideHorizontalLabel: true,
      children: [
        {
          label: t("menu.about"),
          key: "about",
        },
        {
          type: "group",
          label: version ?? t("menu.unknownVersion"),
          key: "version",
          disabled: true,
        },
      ],
    },
  ];
};
