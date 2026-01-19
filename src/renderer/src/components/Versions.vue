<script setup>
import { useSystemStore } from "@renderer/stores/system";
import { computed } from "vue";

const system = useSystemStore();

const tags = computed(() => {
  return [
    { type: "info", label: system.app.displayName, value: system.app.version ?? "⚠" },
    { type: "info", label: "Electron", value: system.info.versions?.electron ?? "⚠" },
    { type: "info", label: "Chromium", value: system.info.versions?.chrome ?? "⚠" },
    { type: "info", label: "Node", value: system.info.versions?.node ?? "⚠" },
    { type: "info", label: "V8", value: system.info.versions?.v8 ?? "⚠" },
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
