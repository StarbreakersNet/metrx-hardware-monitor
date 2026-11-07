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

// Clés des multiples d'octets dans locales/*.json (units.*) : octets, Ko, Mo… / bytes, KB, MB…
const BYTE_UNIT_KEYS = ["b", "kb", "mb", "gb", "tb", "pb", "eb", "zb", "yb"];

function byteUnit(index) {
  return i18n.global.t("units." + BYTE_UNIT_KEYS[index]);
}

export function formatBytes(bytes, precision = 2) {
  if (+bytes) {
    const k = 1000;
    const dm = precision < 0 ? 0 : precision;

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return { value: parseFloat((bytes / Math.pow(k, i)).toFixed(dm)), unit: byteUnit(i) };
  } else {
    return { value: 0, unit: byteUnit(0) };
  }
}

/** Libellé traduit d'une unité (`UNITS`), indépendant de la valeur : « Octet » / « Byte », « % »… */
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

/** Libellé traduit de l'unité adapté à la valeur (multiple d'octets : Ko, Mo, Go…) */
export function getValueUnit(value, unit) {
  switch (unit) {
    case UNITS.BYTES:
      return formatBytes(value).unit;
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
