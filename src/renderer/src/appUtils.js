import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import _ from "lodash";
import { NIcon } from "naive-ui";
import { h } from "vue";

export class Loader {
  constructor() {
    this.count = 0;
    this.loading = false;
  }

  stop() {
    if (this.count > 0) {
      this.count--;
      this.setLoading();
    }
  }

  start() {
    this.count++;
    this.setLoading();
  }

  setLoading() {
    this.loading = this.count > 0;
  }
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

export default {
  Loader,
  getLoaderComputed(loaderCollection) {
    let loaderList = _.map(loaderCollection, loader => {
      return loader.loading;
    });
    return _.some(loaderList);
  },
};
