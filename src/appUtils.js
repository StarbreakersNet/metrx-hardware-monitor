import { naiveDark, naiveLight } from "@/assets/themes/naiveTheme";
import { i18n } from "@/i18n";
import { UNITS } from "@/models/units";
import AppIcon from "@/components/Utils/AppIcon.vue";
import _ from "lodash";
import { darkTheme, lightTheme, NIcon } from "naive-ui";
import { h } from "vue";

export class Loader {
  constructor() {
    this.count = 0;
    this.loading = false;
    this.minDelay = 500;
  }

  async stop() {
    if (this.count > 1) {
      this.count--;
      this.setLoading();
    } else if (this.count === 1) {
      await delay(this.minDelay);
      this.count--;
      this.setLoading();
    }
  }

  start() {
    this.count++;
    this.startTimestamp = Date.now();
    this.setLoading();
  }

  setLoading() {
    this.loading = this.count > 0;
  }
}

export class Timer {
  constructor() {
    this.startTime = null;
    this.elapsedTime = 0;
    this.timerInterval = null;
  }

  start() {
    if (!this.timerInterval) {
      this.startTime = Date.now();
      this.elapsedTime = 0;

      this.timerInterval = setInterval(() => {
        this.elapsedTime = Math.floor(Date.now() - this.startTime);
      }, 1000);
    }
  }

  stop() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Clés des multiples d'octets dans locales/*.json (units.*) : o, Ko, Mo… / B, KB, MB…
const BYTE_UNIT_KEYS = ["b", "kb", "mb", "gb", "tb", "pb", "eb", "zb", "yb"];
// Les symboles des hertz sont les mêmes dans toutes les langues
const HERTZ_UNITS = ["Hz", "kHz", "MHz", "GHz", "THz"];

function byteUnit(index) {
  return i18n.global.t("units." + BYTE_UNIT_KEYS[index]);
}

/** Valeur ramenée au multiple adapté de `base` (index du multiple dans la liste des unités) */
function scaleByMultiple(value, precision, unitCount, base) {
  const index = Math.min(Math.max(Math.floor(Math.log(value) / Math.log(base)), 0), unitCount - 1);
  const scaled = value / Math.pow(base, index);

  return { value: parseFloat(scaled.toFixed(Math.max(precision, 0))), index };
}

/**
 * Les octets affichés sont tous de la mémoire (RAM, VRAM, caches du CPU, swap) : base 1024, comme
 * macOS et Windows, avec leurs symboles (Go / GB). En base 1000, 16 Go de RAM s'affichaient
 * 17,18 Go.
 */
export const BYTES_BASE = 1024;

export function formatBytes(bytes, precision = 2) {
  if (!(bytes > 0)) {
    return { value: 0, unit: byteUnit(0) };
  }

  const { value, index } = scaleByMultiple(bytes, precision, BYTE_UNIT_KEYS.length, BYTES_BASE);

  return { value, unit: byteUnit(index) };
}

export function formatHertz(hertz, precision = 2) {
  if (!(hertz > 0)) {
    return { value: 0, unit: HERTZ_UNITS[0] };
  }

  const { value, index } = scaleByMultiple(hertz, precision, HERTZ_UNITS.length, 1000);

  return { value, unit: HERTZ_UNITS[index] };
}

/** Symbole traduit d'une unité (`UNITS`), indépendant de la valeur : « o » / « B », « Hz », « % »… */
export function getUnitLabel(unit) {
  const key = "units.labels." + unit;

  return unit && i18n.global.te(key) ? i18n.global.t(key) : (unit ?? "");
}

export function formatValue({ value, unit, showUnit = false, precision = 2 }) {
  let formatedValue = value;
  switch (unit) {
    case UNITS.PERCENT:
      formatedValue = Math.round(value);
      break;
    case UNITS.BYTES:
      formatedValue = formatBytes(value, precision).value;
      break;
    case UNITS.HERTZ:
      formatedValue = formatHertz(value, precision).value;
      break;
  }

  if (typeof formatedValue === "number") {
    if (precision > 0) {
      formatedValue = parseFloat(formatedValue.toFixed(precision));
    } else {
      formatedValue = Math.round(formatedValue);
    }
  }

  if (showUnit) {
    return formatedValue + " " + getValueUnit(value, unit);
  } else {
    return formatedValue;
  }
}

/** Symbole de l'unité adapté à la valeur (multiples : Ko, Mo, Go… / MHz, GHz…) */
export function getValueUnit(value, unit) {
  switch (unit) {
    case UNITS.BYTES:
      return formatBytes(value).unit;
    case UNITS.HERTZ:
      return formatHertz(value).unit;
    default:
      return getUnitLabel(unit);
  }
}

export function renderAppIcon(option) {
  if (option.appIcon) {
    return h(NIcon, null, () => h(AppIcon, { name: option.appIcon }));
  } else {
    return null;
  }
}

export function preferedOsTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const themeMappings = {
  dark: { naive: naiveDark, naiveOverride: darkTheme },
  light: { naive: naiveLight, naiveOverride: lightTheme },
};

function getTheme(theme, type) {
  const osTheme = preferedOsTheme();

  if (theme === "system" || !theme) {
    theme = osTheme;
  }

  return themeMappings[theme][type] ?? themeMappings.dark[type];
}

export function getNaiveTheme(theme) {
  return getTheme(theme, "naiveOverride");
}

export function getNaiveOverrideTheme(theme) {
  return getTheme(theme, "naive");
}

export function withOpacity(color, opacity = 0.5) {
  if (color.startsWith("#")) {
    let hex = color.substring(1);
    let r, g, b;

    if (hex.length === 3 || hex.length === 4) {
      // #RGB / #RGBA
      r = hex.charAt(0) + hex.charAt(0);
      g = hex.charAt(1) + hex.charAt(1);
      b = hex.charAt(2) + hex.charAt(2);
    } else {
      // #RRGGBB / #RRGGBBAA
      r = hex.substring(0, 2);
      g = hex.substring(2, 4);
      b = hex.substring(4, 6);
    }

    const a = Math.round(opacity * 255)
      .toString(16)
      .padStart(2, "0");
    return "#" + r + g + b + a;
  }

  if (color.includes("rgba") || color.includes("hsla")) {
    return color.replace(/[\d.]+\)$/, `${opacity})`);
  }

  if (color.includes("rgb") || color.includes("hsl")) {
    return color.replace(")", `, ${opacity})`).replace("rgb(", "rgba(").replace("hsl(", "hsla(");
  }

  return `${color}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

export default {
  Loader,
  getLoaderComputed(loaderCollection) {
    let loaderList = _.map(loaderCollection, loader => {
      return loader.loading;
    });
    return _.some(loaderList);
  },
};
