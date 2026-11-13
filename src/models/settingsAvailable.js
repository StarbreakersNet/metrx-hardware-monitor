/**
 * Paramètres affichés dans la page « Paramètres ».
 *
 * Les textes sont traduits à l'affichage : `key` désigne la catégorie (`settings.categories.*`)
 * ou le réglage (`settings.items.*.label`, `.description` et `.info` si `info: true`).
 * Les options utilisent `labelKey` (traduit) ou `label` (affiché tel quel).
 */
/** Fréquences proposées pour les sondes et pour les courbes */
const FREQUENCY_OPTIONS = [
  { label: "500ms", value: 500 },
  { label: "1s", value: 1000 },
  { label: "2s", value: 2000 },
  { label: "3s", value: 3000 },
  { label: "4s", value: 4000 },
  { label: "5s", value: 5000 },
  { label: "10s", value: 10000 },
  { label: "20s", value: 20000 },
  { label: "30s", value: 30000 },
  { label: "1min", value: 60000 },
];

export default [
  {
    type: "categ",
    key: "interface",
    children: [
      {
        type: "select",
        icon: "language",
        key: "language",
        options: [
          { labelKey: "settings.items.language.system", value: "system" },
          { label: "Français", value: "fr" },
          { label: "English", value: "en" },
        ],
        storePath: ["desktop", "language"],
      },
      {
        type: "select",
        icon: "palette-filled",
        key: "theme",
        options: [
          { labelKey: "settings.items.theme.dark", value: "dark" },
          { labelKey: "settings.items.theme.light", value: "light" },
          { labelKey: "settings.items.theme.system", value: "system" },
        ],
        storePath: ["settings", "theme"],
      },
      {
        type: "select",
        icon: "metronome",
        key: "nodeFrequency",
        options: FREQUENCY_OPTIONS,
        storePath: ["settings", "nodeFrequency"],
      },
      {
        type: "switch",
        icon: "layout-sidebar-left-collapse-filled",
        key: "showSideMenu",
        storePath: ["settings", "showSideMenu"],
      },
    ],
  },
  {
    type: "categ",
    key: "charts",
    children: [
      {
        type: "select",
        icon: "chart-line",
        key: "chartFrequency",
        info: true,
        options: FREQUENCY_OPTIONS,
        storePath: ["settings", "chartFrequency"],
      },
      {
        type: "number",
        icon: "table-filled",
        key: "chartColumns",
        storePath: ["settings", "chartColumns"],
      },
      {
        type: "number",
        icon: "ruler-measure-2",
        key: "chartHeight",
        min: 5,
        max: 50,
        storePath: ["settings", "chartHeight"],
      },
      {
        type: "number",
        icon: "arrow-autofit-width-filled",
        key: "chartBufferSize",
        max: 30,
        storePath: ["settings", "chartBufferSize"],
      },
      {
        type: "switch",
        icon: "crosshair",
        key: "chartCursorSync",
        storePath: ["settings", "chartCursorSync"],
      },
      {
        type: "switch",
        icon: "chart-area-filled",
        key: "showXLabel",
        storePath: ["settings", "showXLabel"],
      },
      {
        type: "switch",
        icon: "heading",
        key: "showChartTitle",
        storePath: ["settings", "showChartTitle"],
      },
      {
        type: "switch",
        icon: "player-play-filled",
        key: "chartAnimation",
        info: true,
        storePath: ["settings", "chartAnimation"],
      },
    ],
  },
  {
    type: "categ",
    key: "system",
    children: [
      {
        type: "switch",
        icon: "power",
        key: "startOnLogin",
        storePath: ["desktop", "startOnLogin"],
      },
      {
        type: "switch",
        icon: "minimize",
        key: "startMinimized",
        storePath: ["desktop", "startMinimized"],
      },
    ],
  },
  {
    type: "categ",
    key: "update",
    children: [
      {
        type: "switch",
        icon: "refresh",
        key: "autoUpdate",
        storePath: ["settings", "autoUpdate"],
      },
      {
        type: "select",
        icon: "git-branch",
        key: "updateChannel",
        options: [
          { label: "Live", value: "latest" },
          { label: "Preview", value: "beta" },
          { label: "Nightly", value: "alpha" },
        ],
        storePath: ["settings", "updateChannel"],
      },
    ],
  },
];
