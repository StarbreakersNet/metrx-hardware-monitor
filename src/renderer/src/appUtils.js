import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import _ from "lodash";
import { darkTheme, lightTheme, NIcon } from "naive-ui";
import { h } from "vue";
import { naiveDark, naiveLight } from "@renderer/assets/themes/naiveTheme";

export class Loader {
  constructor() {
    this.count = 0;
    this.loading = false;
    this.minDelay = 500;
  }

  async stop() {
    const elapsed = Date.now() - this.startTimestamp;
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

export function formatBytes(bytes, decimals = 2) {
  if (+bytes) {
    const k = 1000;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["octets", "Ko", "Mo", "Go", "To", "Po", "Eo", "Zo", "Yo"];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return { value: parseFloat((bytes / Math.pow(k, i)).toFixed(dm)), unit: sizes[i] };
  } else {
    return { value: 0, unit: "octets" };
  }
}

export function formatValue({ value, unit, showUnit = false, decimals = 2 }) {
  let formatedValue = value;
  switch (unit) {
    case "%":
      formatedValue = Math.round(value);
      break;
    case "B":
      formatedValue = formatBytes(value, decimals).value;
      break;
    case "Mo":
      formatedValue = formatBytes(value * 1024 * 1024, decimals).value;
      break;
  }

  if (typeof formatedValue === "number") {
    if (decimals > 0) {
      formatedValue = parseFloat(formatedValue.toFixed(decimals));
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

export function getValueUnit(value, unit) {
  switch (unit) {
    case "B":
      return formatBytes(value).unit;
    case "Mo":
      return formatBytes(value * 1000 * 1000).unit;
    default:
      return unit;
  }
}

export function renderFontAwesomeIcon(option) {
  if (option.fas) {
    return h(NIcon, null, () => h(FontAwesomeIcon, { icon: ["fas", option.fas] }));
  } else if (option.far) {
    return h(NIcon, null, () => h(FontAwesomeIcon, { icon: ["far", option.far] }));
  } else if (option.fab) {
    return h(NIcon, null, () => h(FontAwesomeIcon, { icon: ["fab", option.fab] }));
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

export default {
  Loader,
  getLoaderComputed(loaderCollection) {
    let loaderList = _.map(loaderCollection, loader => {
      return loader.loading;
    });
    return _.some(loaderList);
  },
};
