<script setup>
import AppMasonry from "@/components/AppMasonry.vue";
import StatsValue from "@/components/Stats/StatsValue.vue";
import AppIcon from "@/components/Utils/AppIcon.vue";
import { useThemeVars } from "naive-ui";
import { useI18n } from "vue-i18n";

/** Vue détaillée : une carte par source de la lib, avec toutes ses valeurs */
const props = defineProps({
  sections: {
    type: Array,
    required: true,
  },
  showKeys: {
    type: Boolean,
    default: true,
  },
  // Pendant une recherche, seules les lignes trouvées sont montrées (pas les graphiques par cœur)
  searching: {
    type: Boolean,
    default: false,
  },
});

const { t } = useI18n();
const themeVars = useThemeVars();

function getBarStyle(bars, bar) {
  const hot = bars.warn !== undefined && bar.value >= bars.warn;

  return {
    height: Math.max(4, Math.round(bar.percent * 0.6)) + "px",
    background: hot ? themeVars.value.warningColor : themeVars.value.primaryColor,
  };
}
</script>

<template>
  <app-masonry :items="props.sections">
    <template #default="{ item: section }">
      <n-card class="section-card" size="small">
        <template #header>
          <n-flex :wrap="false" align="center" class="section-header">
            <n-avatar :size="36" class="section-icon">
              <app-icon :name="section.icon" />
            </n-avatar>
            <n-flex :size="0" align="start" vertical>
              <n-text strong>{{ section.title }}</n-text>
              <n-text class="section-meta" depth="3">
                <template v-if="props.showKeys">
                  <n-text code depth="3">{{ section.fn }}</n-text>
                  ·
                </template>
                {{ t("stats.valueCount", { count: section.rows.length }, section.rows.length) }}
              </n-text>
            </n-flex>
          </n-flex>
        </template>
        <template #header-extra>
          <n-a :href="section.doc" target="_blank">{{ t("stats.documentation") }}</n-a>
        </template>

        <n-flex size="large" vertical>
          <n-card v-if="!props.searching" :bordered="false" embedded size="small">
            <n-flex :size="6" vertical>
              <n-flex align="baseline" justify="space-between">
                <n-text v-if="section.figure.value" class="figure-value" strong>
                  {{ section.figure.value }}
                </n-text>
                <n-tag v-else :bordered="false" round>{{ t("stats.notReported") }}</n-tag>
                <n-tag
                  v-if="section.figure.note"
                  :bordered="false"
                  round
                  size="small"
                  type="warning">
                  {{ section.figure.note }}
                </n-tag>
              </n-flex>
              <n-text v-if="section.figure.details" depth="3">{{ section.figure.details }}</n-text>
              <n-progress
                v-if="section.figure.percent !== undefined"
                :height="6"
                :percentage="section.figure.percent"
                :show-indicator="false"
                :status="section.figure.percent >= 90 ? 'error' : 'success'"
                type="line" />
            </n-flex>
          </n-card>

          <n-flex v-if="section.bars && !props.searching" :size="6" vertical>
            <n-text class="bars-title" depth="3">{{ section.bars.title }}</n-text>
            <div class="bars" role="img" :aria-label="section.bars.title">
              <n-tooltip v-for="bar in section.bars.values" :key="bar.index">
                <template #trigger>
                  <div :style="getBarStyle(section.bars, bar)" class="bar" />
                </template>
                {{ t("stats.barTooltip", { index: bar.index, value: bar.label }) }}
              </n-tooltip>
            </div>
            <n-flex class="bars-legend" justify="space-between">
              <n-text depth="3">{{ t("stats.barIndex", { index: 0 }) }}</n-text>
              <n-text depth="3">
                {{ t("stats.barIndex", { index: section.bars.values.length - 1 }) }}
              </n-text>
            </n-flex>
          </n-flex>

          <n-grid :x-gap="24" cols="1 440:2" responsive="self">
            <n-gi v-for="row in section.rows" :key="row.id">
              <n-flex :wrap="false" class="row" justify="space-between">
                <n-flex :size="0" align="start" class="row-label" vertical>
                  <span>{{ row.label }}</span>
                  <n-text v-if="props.showKeys" class="row-key" code depth="3">
                    {{ row.key }}
                  </n-text>
                </n-flex>
                <stats-value :row="row" class="row-value" />
              </n-flex>
            </n-gi>
          </n-grid>
        </n-flex>
      </n-card>
    </template>
  </app-masonry>
</template>

<style lang="sass" scoped>
// Le titre passe à la ligne ; le lien « Documentation » garde sa largeur
.section-card
  :deep(.n-card-header)
    column-gap: 1em

  :deep(.n-card-header__main)
    min-width: 0

  :deep(.n-card-header__extra)
    flex-shrink: 0

.section-header
  min-width: 0

.section-icon
  flex-shrink: 0

.section-meta,
.row-key
  font-size: .8em
  overflow-wrap: anywhere

.figure-value
  font-size: 1.6em
  line-height: 1.2

.bars-title
  font-size: .75em
  font-weight: 600
  text-transform: uppercase
  letter-spacing: .04em

.bars
  display: flex
  align-items: flex-end
  gap: 3px
  height: 64px
  border-bottom: 1px solid var(--n-border-color, rgba(128, 128, 128, .3))

  .bar
    flex: 1
    min-width: 3px
    border-radius: 3px 3px 0 0

.bars-legend
  font-size: .75em

.row
  padding: .55em 0
  border-top: 1px solid rgba(128, 128, 128, .18)

.row-label
  min-width: 0

.row-value
  flex-shrink: 0
  max-width: 60%
</style>
