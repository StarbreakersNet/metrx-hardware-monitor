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
      x: pos.x - 20,
      y: chart.chartArea.bottom - 5,
      xAlign: "right",
      yAlign: "bottom",
    };
  };
}

export const continuousRefresh = {
  id: "continuousRefresh",

  beforeInit(chart) {
    chart.$refreshIntervalId = null;
    chart.$mousePosition = { x: null, y: null };
  },

  afterInit(chart) {
    // Capture mouse position
    chart.canvas.addEventListener("mousemove", e => {
      const rect = chart.canvas.getBoundingClientRect();
      chart.$mousePosition = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    });

    // Capture mouse leaving canvas
    chart.canvas.addEventListener("mouseleave", () => {
      chart.$mousePosition = { x: null, y: null };
    });

    // Start interval to simulate mouse movements
    chart.$refreshIntervalId = setInterval(() => {
      if (chart.$mousePosition.x !== null) {
        // Simuler un événement mousemove à la dernière position connue
        const event = new MouseEvent("mousemove", {
          clientX: chart.$mousePosition.x + chart.canvas.getBoundingClientRect().left,
          clientY: chart.$mousePosition.y + chart.canvas.getBoundingClientRect().top,
          bubbles: true,
        });

        chart.canvas.dispatchEvent(event);
      }
    }, 100); // Refresh every 100ms
  },

  // Clean up resources on destruction
  destroy(chart) {
    if (chart.$refreshIntervalId) {
      clearInterval(chart.$refreshIntervalId);
    }

    chart.canvas.removeEventListener("mousemove", () => {});
    chart.canvas.removeEventListener("mouseleave", () => {});
  },
};
