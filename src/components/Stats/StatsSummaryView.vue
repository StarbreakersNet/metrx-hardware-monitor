<script setup>
import AppMasonry from "@/components/AppMasonry.vue";
import StatsValue from "@/components/Stats/StatsValue.vue";
import AppIcon from "@/components/Utils/AppIcon.vue";
import { useI18n } from "vue-i18n";

/** Synthèse : l'essentiel de chaque composant dans un tableau compact */
const props = defineProps({
  groups: {
    type: Array,
    required: true,
  },
  showKeys: {
    type: Boolean,
    default: true,
  },
  // Nombre de valeurs de la vue détaillée, par composant
  detailCounts: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(["details"]);

const { t } = useI18n();
</script>

<template>
  <app-masonry :items="props.groups">
    <template #default="{ item: group }">
      <n-card class="summary-card" size="small">
        <template #header>
          <n-flex :wrap="false" align="center" class="group-header">
            <n-avatar :size="36" class="group-icon">
              <app-icon :name="group.icon" />
            </n-avatar>
            <n-flex :size="0" align="start" class="group-titles" vertical>
              <n-text strong>{{ group.title }}</n-text>
              <n-text class="group-sources" code depth="3">{{ group.sources }}</n-text>
            </n-flex>
          </n-flex>
        </template>
        <template #header-extra>
          <n-button secondary size="small" type="primary" @click="emit('details', group.component)">
            {{ t("stats.details", { count: props.detailCounts[group.component] ?? 0 }) }}
          </n-button>
        </template>
        <n-table :bordered="false" size="small">
          <thead>
            <tr>
              <th>{{ t("stats.columns.name") }}</th>
              <th class="value-column">{{ t("stats.columns.value") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in group.rows" :key="row.id">
              <td>
                <n-flex :size="0" align="start" vertical>
                  <span>{{ row.label }}</span>
                  <n-text v-if="props.showKeys" class="row-key" code depth="3">
                    {{ row.key }}
                  </n-text>
                </n-flex>
              </td>
              <td class="value-column">
                <stats-value :row="row" show-bar />
              </td>
            </tr>
          </tbody>
        </n-table>
      </n-card>
    </template>
  </app-masonry>
</template>

<style lang="sass" scoped>
// Le titre et les sources passent à la ligne ; le bouton « Détails » garde sa largeur
.summary-card
  :deep(.n-card-header)
    column-gap: 1em

  :deep(.n-card-header__main)
    min-width: 0

  :deep(.n-card-header__extra)
    flex-shrink: 0

.group-header,
.group-titles
  min-width: 0

.group-icon
  flex-shrink: 0
  color: var(--n-color-target, currentColor)

.group-sources,
.row-key
  font-size: .75em
  overflow-wrap: anywhere

.value-column
  text-align: right
</style>
