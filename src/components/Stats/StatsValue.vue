<script setup>
import { useI18n } from "vue-i18n";

/** Valeur d'une ligne de la page Données : jauge éventuelle, valeur ou « Non remonté », note */
const props = defineProps({
  row: {
    type: Object,
    required: true,
  },
  // Affiche la jauge quand la ligne a un pourcentage
  showBar: {
    type: Boolean,
    default: false,
  },
});

const { t } = useI18n();
</script>

<template>
  <n-flex :size="4" align="end" vertical>
    <n-flex :wrap="false" align="center" justify="end">
      <n-progress
        v-if="props.showBar && props.row.percent !== undefined"
        :height="6"
        :percentage="props.row.percent"
        :show-indicator="false"
        :status="props.row.warn ? 'error' : 'success'"
        class="value-bar"
        type="line" />
      <n-tag v-if="props.row.missing" :bordered="false" round size="small">
        {{ t("stats.notReported") }}
      </n-tag>
      <n-text v-else class="value-text" strong>{{ props.row.value }}</n-text>
    </n-flex>
    <n-text v-if="props.row.note" class="value-note" type="info">{{ props.row.note }}</n-text>
  </n-flex>
</template>

<style lang="sass" scoped>
.value-bar
  width: 72px
  flex-shrink: 0

.value-text
  font-variant-numeric: tabular-nums
  overflow-wrap: anywhere
  text-align: right

.value-note
  font-size: .8em
</style>
