import naiveCommon from "@renderer/assets/themes/naive.common";
import naiveDarkJson from "@renderer/assets/themes/naive.dark";
import naiveLightJson from "@renderer/assets/themes/naive.light";
import _ from "lodash";

export let naiveDark = _.mergeWith({}, structuredClone(naiveCommon), naiveDarkJson);
export let naiveLight = _.mergeWith({}, structuredClone(naiveCommon), naiveLightJson);
