import naiveCommon from "@renderer/assets/themes/naive.common.json";
import naiveDarkJson from "@renderer/assets/themes/naive.dark.json";
import naiveLightJson from "@renderer/assets/themes/naive.light.json";

export let naiveDark = Object.assign({ ...naiveCommon }, naiveDarkJson);
export let naiveLight = Object.assign({ ...naiveCommon }, naiveLightJson);
