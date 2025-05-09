import naiveCommon from "@renderer/assets/themes/naive.common";
import naiveDarkJson from "@renderer/assets/themes/naive.dark";
import naiveLightJson from "@renderer/assets/themes/naive.light";

export let naiveDark = Object.assign({ ...naiveCommon }, naiveDarkJson);
export let naiveLight = Object.assign({ ...naiveCommon }, naiveLightJson);
