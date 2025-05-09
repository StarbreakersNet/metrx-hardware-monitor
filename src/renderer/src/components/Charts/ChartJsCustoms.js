import { Tooltip } from "chart.js";

export function registerTooltipCustoms() {
  Tooltip.positioners.bottom = function (items) {
    if (!items?.length || !this?.chart?.chartArea) {
      return false;
    }

    const pos = Tooltip.positioners.average(items);

    if (pos === false) {
      return false;
    }

    const chart = this.chart;

    return {
      x: pos.x,
      y: chart.chartArea.bottom - 5,
      xAlign: "center",
      yAlign: "bottom",
    };
  };
}
