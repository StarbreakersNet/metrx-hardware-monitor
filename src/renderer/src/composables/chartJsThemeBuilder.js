import { computed, onBeforeMount, watch } from "vue";
import { Chart as ChartJS } from "chart.js";
import { useUserStore } from "@renderer/stores/user";
import { chartJsDark, chartJsLight } from "@renderer/assets/themes/chartJsTheme";

export function useChartTheme() {
  const userStore = useUserStore();

  const colorPalettes = {
    light: chartJsLight,
    dark: chartJsDark,
  };

  const currentTheme = computed(() => {
    return userStore.settings.theme === "system"
      ? userStore.settings.osTheme
      : userStore.settings.theme;
  });

  const themeComputed = computed(() => {
    return colorPalettes[currentTheme.value] || colorPalettes.light;
  });

  function applyChartTheme() {
    ChartJS.defaults.color = themeComputed.value.subtextColor;
    ChartJS.defaults.scale.grid.color = themeComputed.value.gridColor;
    ChartJS.defaults.scale.ticks.color = themeComputed.value.subtextColor;
    ChartJS.defaults.scale.border.color = themeComputed.value.borderColor;
    ChartJS.defaults.plugins.tooltip.backgroundColor = themeComputed.value.backgroundColor;
    ChartJS.defaults.plugins.tooltip.borderWidth = themeComputed.value.tooltip.borderWidth;
    ChartJS.defaults.plugins.tooltip.cornerRadius = themeComputed.value.tooltip.cornerRadius;
    ChartJS.defaults.plugins.tooltip.caretPadding = themeComputed.value.tooltip.caretPadding;
    ChartJS.defaults.plugins.tooltip.caretSize = themeComputed.value.tooltip.caretSize;
    ChartJS.defaults.plugins.tooltip.usePointStyle = themeComputed.value.tooltip.usePointStyle;
    ChartJS.defaults.plugins.tooltip.borderColor = themeComputed.value.borderColor;
    ChartJS.defaults.plugins.tooltip.titleColor = themeComputed.value.textColor;
    ChartJS.defaults.plugins.tooltip.bodyColor = themeComputed.value.textColor;
    ChartJS.defaults.plugins.tooltip.footerColor = themeComputed.value.textColor;
  }

  function getDatasetColor(index) {
    const colors = themeComputed.value.colors;

    return colors[index % colors.length];
  }

  function getColorsForDatasets(count) {
    const colors = themeComputed.value.colors;

    return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
  }

  onBeforeMount(() => {
    applyChartTheme();
  });

  watch(currentTheme, (newTheme, oldTheme) => {
    if (newTheme !== oldTheme) {
      applyChartTheme();
    }
  });

  return {
    currentTheme,
    themeComputed,
    colorPalettes,
    getDatasetColor,
    getColorsForDatasets,
    applyChartTheme,
  };
}
