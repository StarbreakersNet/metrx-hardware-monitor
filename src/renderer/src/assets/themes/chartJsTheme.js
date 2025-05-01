import chartJsCommonJson from "@renderer/assets/themes/chartJs.common";
import chartJsDarkJson from "@renderer/assets/themes/chartJs.dark";
import chartJsLightJson from "@renderer/assets/themes/chartJs.light";

export let chartJsDark = Object.assign({ ...chartJsCommonJson }, chartJsDarkJson);
export let chartJsLight = Object.assign({ ...chartJsCommonJson }, chartJsLightJson);
