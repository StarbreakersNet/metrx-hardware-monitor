<script setup>
import StatSummary from "@/components/StatSummary.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>
<template>
  <n-flex vertical>
    <n-h1>{{ t("stats.title") }}</n-h1>
    <stat-summary />
  </n-flex>
</template>
<style lang="sass" scoped></style>
