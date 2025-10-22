import { valueOrDefault } from "chart.js/helpers";

export function useCrosshairPlugin() {
  const defaultOptions = {
    line: {
      color: "#F66",
      width: 1,
      dashPattern: [],
    },
    sync: {
      enabled: true,
      group: 1,
      suppressTooltips: false,
      axis: "xy", // possible values: 'x' | 'xy'
    },
    snap: {
      enabled: false,
    },
  };

  function getOption(chart, category, name) {
    return valueOrDefault(
      chart.options.plugins.crosshair[category]
        ? chart.options.plugins.crosshair[category][name]
        : undefined,
      defaultOptions[category][name]
    );
  }

  function getXScale(chart) {
    return chart.data.datasets.length ? chart.scales[chart.getDatasetMeta(0).xAxisID] : null;
  }

  function getYScale(chart) {
    return chart.scales[chart.getDatasetMeta(0).yAxisID];
  }

  function handleSyncEvent(chart, e) {
    const syncGroup = getOption(chart, "sync", "group");

    if (e.chartId === chart.id) {
      return;
    }

    if (e.syncGroup !== syncGroup) {
      return;
    }

    const xScale = getXScale(chart);

    if (!xScale) {
      return;
    }

    // Fix Safari
    const buttons =
      e.original.native.buttons === undefined ? e.original.native.which : e.original.native.buttons;

    const eventType = e.original.type === "click" ? "mousemove" : e.original.type;

    const syncAxis = getOption(chart, "sync", "axis");
    const newY = syncAxis.includes("y") ? e.original.y : chart.chartArea.top;

    const newEvent = {
      type: eventType,
      chart: chart,
      x: xScale.getPixelForValue(e.xValue),
      y: newY,
      native: {
        type: eventType,
        buttons: buttons,
      },
      stop: true,
    };
    chart._eventHandler(newEvent);
  }

  function createCrosshairPlugin() {
    return {
      id: "crosshair",

      afterInit(chart) {
        if (!chart.config.options.scales.x) {
          return;
        }

        const xScaleType = chart.config.options.scales.x.type;

        if (
          xScaleType !== "linear" &&
          xScaleType !== "time" &&
          xScaleType !== "category" &&
          xScaleType !== "logarithmic"
        ) {
          return;
        }

        if (chart.options.plugins?.crosshair === undefined) {
          chart.options.plugins.crosshair = defaultOptions;
        }

        chart.crosshair = {
          enabled: false,
          suppressUpdate: false,
          x: null,
          suppressTooltips: false,
          _syncEnabled: false,
        };

        this.updateSyncEventListeners(chart);
      },

      updateSyncEventListeners(chart) {
        const syncEnabled = getOption(chart, "sync", "enabled");

        if (syncEnabled !== chart.crosshair?._syncEnabled) {
          if (syncEnabled) {
            chart.crosshair.syncEventHandler = e => handleSyncEvent(chart, e);

            window.addEventListener("sync-event", chart.crosshair.syncEventHandler);
          } else if (chart.crosshair?.syncEventHandler) {
            window.removeEventListener("sync-event", chart.crosshair.syncEventHandler);

            chart.crosshair.syncEventHandler = null;
          }

          chart.crosshair._syncEnabled = syncEnabled;
        }
      },

      beforeUpdate(chart) {
        this.updateSyncEventListeners(chart);
        return true;
      },

      afterDestroy(chart) {
        if (chart.crosshair?.syncEventHandler) {
          window.removeEventListener("sync-event", chart.crosshair.syncEventHandler);
        }
      },

      // Gestion des événements
      afterEvent(chart, event) {
        if (chart.config.options.scales.x.length === 0) {
          return;
        }

        const e = event.event;

        const xScaleType = chart.config.options.scales.x.type;

        if (
          xScaleType !== "linear" &&
          xScaleType !== "time" &&
          xScaleType !== "category" &&
          xScaleType !== "logarithmic"
        ) {
          return;
        }

        const xScale = getXScale(chart);

        if (!xScale) {
          return;
        }

        const syncEnabled = getOption(chart, "sync", "enabled");
        const syncGroup = getOption(chart, "sync", "group");

        if (!e.stop && syncEnabled) {
          const event = new CustomEvent("sync-event");
          event.chartId = chart.id;
          event.syncGroup = syncGroup;
          event.original = e;
          event.xValue = xScale.getValueForPixel(e.x);
          window.dispatchEvent(event);
        }

        const suppressTooltips = getOption(chart, "sync", "suppressTooltips");
        chart.crosshair.suppressTooltips = e.stop && suppressTooltips;

        chart.crosshair.enabled =
          e.type !== "mouseout" &&
          e.x > xScale.getPixelForValue(xScale.min) &&
          e.x < xScale.getPixelForValue(xScale.max);

        if (!chart.crosshair.enabled && !chart.crosshair.suppressUpdate) {
          if (e.x > xScale.getPixelForValue(xScale.max)) {
            chart.crosshair.suppressUpdate = true;
            chart.update("none");
          }
          return false;
        }
        chart.crosshair.suppressUpdate = false;

        chart.crosshair.x = e.x;

        chart.draw();
      },

      afterDraw(chart) {
        if (!chart.crosshair?.enabled) {
          return;
        }

        this.drawTraceLine(chart);
        this.interpolateValues(chart);
        this.drawTracePoints(chart);

        return true;
      },

      drawTraceLine(chart) {
        const yScale = getYScale(chart);

        const lineWidth = getOption(chart, "line", "width");
        const color = getOption(chart, "line", "color");
        const dashPattern = getOption(chart, "line", "dashPattern");
        const snapEnabled = getOption(chart, "snap", "enabled");

        let lineX = chart.crosshair.x;

        if (snapEnabled && chart._active.length) {
          lineX = chart._active[0].element.x;
        }

        chart.ctx.beginPath();
        chart.ctx.setLineDash(dashPattern);
        chart.ctx.moveTo(lineX, yScale.getPixelForValue(yScale.max));
        chart.ctx.lineWidth = lineWidth;
        chart.ctx.strokeStyle = color;
        chart.ctx.lineTo(lineX, yScale.getPixelForValue(yScale.min));
        chart.ctx.stroke();
        chart.ctx.setLineDash([]);
      },

      drawTracePoints(chart) {
        for (let chartIndex = 0; chartIndex < chart.data.datasets.length; chartIndex++) {
          const dataset = chart.data.datasets[chartIndex];
          const meta = chart.getDatasetMeta(chartIndex);

          const yScale = chart.scales[meta.yAxisID];

          if (meta.hidden || !dataset.interpolate) {
            continue;
          }

          chart.ctx.beginPath();
          chart.ctx.arc(
            chart.crosshair.x,
            yScale.getPixelForValue(dataset.interpolatedValue),
            3,
            0,
            2 * Math.PI,
            false
          );
          chart.ctx.fillStyle = "white";
          chart.ctx.lineWidth = 2;
          chart.ctx.strokeStyle = dataset.borderColor;
          chart.ctx.fill();
          chart.ctx.stroke();
        }
      },

      interpolateValues(chart) {
        for (let chartIndex = 0; chartIndex < chart.data.datasets.length; chartIndex++) {
          const dataset = chart.data.datasets[chartIndex];

          const meta = chart.getDatasetMeta(chartIndex);

          const xScale = chart.scales[meta.xAxisID];
          const xValue = xScale.getValueForPixel(chart.crosshair?.x);

          if (meta.hidden || !dataset.interpolate) {
            continue;
          }

          const data = dataset.data;
          const index = data.findIndex(function (o) {
            return o.x >= xValue;
          });
          const prev = data[index - 1];
          const next = data[index];

          if (chart.data.datasets[chartIndex].steppedLine && prev) {
            dataset.interpolatedValue = prev.y;
          } else if (prev && next) {
            const slope = (next.y - prev.y) / (next.x - prev.x);
            dataset.interpolatedValue = prev.y + (xValue - prev.x) * slope;
          } else {
            dataset.interpolatedValue = NaN;
          }
        }
      },

      beforeTooltipDraw(chart) {
        return !chart.crosshair?.suppressTooltips;
      },
    };
  }

  return {
    crosshairPlugin: createCrosshairPlugin(),
  };
}
