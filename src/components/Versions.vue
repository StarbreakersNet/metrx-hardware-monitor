<script setup>
import { useSystemStore } from "@/stores/system";
import { computed } from "vue";

const system = useSystemStore();

const tags = computed(() => {
  return [
    { type: "info", label: system.app.displayName, value: system.app.version ?? "⚠" },
    { type: "info", label: "Tauri", value: system.info.versions?.tauri ?? "⚠" },
    { type: "info", label: "WebView", value: system.info.versions?.webview ?? "⚠" },
    { type: "info", label: "Bun", value: system.info.versions?.bun ?? "⚠" },
    { type: "info", label: "SystemInformation", value: system.info.version ?? "⚠" },
  ];
});
</script>

<template>
  <n-flex justify="center">
    <n-tag v-for="tag in tags" :key="tag.label + '#' + tag.value" round type="info">
      {{ tag.label }} v{{ tag.value }}
    </n-tag>
  </n-flex>
</template>
