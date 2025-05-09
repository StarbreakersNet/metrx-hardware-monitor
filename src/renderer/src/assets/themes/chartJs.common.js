import naiveTheme from "./naive.common.js";

export default {
  tooltip: {
    borderWidth: 1,
    cornerRadius: parseInt(naiveTheme.common.borderRadius, 10),
    caretPadding: 0,
    caretSize: 0,
    usePointStyle: true,
  },
  animations: {
    x: {
      duration: 0,
    }
  }
};
