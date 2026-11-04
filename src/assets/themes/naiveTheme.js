import naiveCommon from "@/assets/themes/naive.common";
import naiveDarkJson from "@/assets/themes/naive.dark";
import naiveLightJson from "@/assets/themes/naive.light";
import _ from "lodash";

export let naiveDark = _.mergeWith({}, structuredClone(naiveCommon), naiveDarkJson);
export let naiveLight = _.mergeWith({}, structuredClone(naiveCommon), naiveLightJson);
