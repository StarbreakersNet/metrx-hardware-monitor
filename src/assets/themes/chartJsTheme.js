import chartJsCommonJson from "@/assets/themes/chartJs.common";
import chartJsDarkJson from "@/assets/themes/chartJs.dark";
import chartJsLightJson from "@/assets/themes/chartJs.light";

export let chartJsDark = Object.assign({ ...chartJsCommonJson }, chartJsDarkJson);
export let chartJsLight = Object.assign({ ...chartJsCommonJson }, chartJsLightJson);
