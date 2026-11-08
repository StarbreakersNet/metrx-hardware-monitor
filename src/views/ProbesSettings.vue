<script setup>
import { currentPlatform } from "@/api/app";
import { formatValue } from "@/appUtils";
import AppMasonry from "@/components/AppMasonry.vue";
import AppSpin from "@/components/AppSpin.vue";
import AppIcon from "@/components/Utils/AppIcon.vue";
import { getChartEntries } from "@/models/chartEntries";
import { UNITS } from "@/models/units";
import { useSystemStore } from "@/stores/system";
import { useUserStore } from "@/stores/user";
import { computed, onActivated, onDeactivated } from "vue";
import { useI18n } from "vue-i18n";

const user = useUserStore();
const system = useSystemStore();
const { t } = useI18n();

// La page montre la valeur de chaque tuile, masquée ou non : toutes les sources sont collectées
onActivated(() => system.requestFullCollection("probes"));
onDeactivated(() => system.releaseFullCollection("probes"));

const entries = computed(() => getChartEntries(system.metrics));

function isHidden(entry) {
  return Boolean(user.settings.chartsHidden[entry.id]);
}

function setVisible(entry, visible) {
  if (visible) {
    delete user.settings.chartsHidden[entry.id];
  } else {
    user.settings.chartsHidden[entry.id] = true;
  }
}

function getGroupTitle(entry) {
  if (entry.group.startsWith("gpu")) {
    return [entry.description, entry.groupLabel].filter(Boolean).join(" · ");
  }
  return t(`probes.groups.${entry.group}`);
}

function getValue(entry) {
  return formatValue({
    value: entry.value,
    unit: entry.unit,
    showUnit: true,
    precision: [UNITS.PERCENT, UNITS.CELSIUS].includes(entry.unit) ? 0 : 2,
  });
}

function getNote(entry) {
  // macOS ne remonte que la fréquence nominale du processeur, pas la fréquence mesurée
  if (
    entry.id === "clock#cpu" &&
    currentPlatform === "macos" &&
    !system.metrics.cpuCurrentSpeed?.measured
  ) {
    return t("stats.notes.nominalClock");
  }
  return "";
}

const groups = computed(() => {
  const list = [];

  entries.value.forEach(entry => {
    let group = list.find(item => item.id === entry.group);

    if (!group) {
      group = { id: entry.group, title: getGroupTitle(entry), rows: [] };
      list.push(group);
    }
    group.rows.push({
      entry,
      title: t(`charts.titles.${entry.titleKey}`),
      source: `si.${entry.source}()`,
      value: entry.available ? getValue(entry) : "",
      note: getNote(entry),
      hidden: isHidden(entry),
    });
  });

  return list.map(group => ({
    ...group,
    summary: t("probes.groupSummary", {
      shown: group.rows.filter(row => !row.hidden).length,
      total: group.rows.length,
    }),
  }));
});

const counters = computed(() => {
  const hidden = entries.value.filter(isHidden).length;

  return [
    { key: "shown", value: entries.value.length - hidden },
    { key: "hidden", value: hidden },
    {
      key: "unavailable",
      value: entries.value.filter(entry => !entry.available).length,
      warning: true,
    },
  ];
});

const visibleUnavailable = computed(() =>
  entries.value.filter(entry => !entry.available && !isHidden(entry))
);

function hideUnavailable() {
  visibleUnavailable.value.forEach(entry => setVisible(entry, false));
}

function showAll() {
  user.settings.chartsHidden = {};
}
</script>

<template>
  <n-flex size="large" vertical>
    <n-flex align="end" justify="space-between">
      <n-flex :size="4" class="page-intro" vertical>
        <n-h1>{{ t("probes.title") }}</n-h1>
        <n-text depth="3">{{ t("probes.description") }}</n-text>
      </n-flex>
      <n-flex>
        <n-button :disabled="!visibleUnavailable.length" @click="hideUnavailable()">
          <template #icon>
            <app-icon name="eye-off" />
          </template>
          {{ t("probes.hideUnavailable") }}
        </n-button>
        <n-button :disabled="!counters[1].value" type="primary" @click="showAll()">
          <template #icon>
            <app-icon name="eye" />
          </template>
          {{ t("probes.showAll") }}
        </n-button>
      </n-flex>
    </n-flex>

    <n-flex>
      <n-card v-for="counter in counters" :key="counter.key" class="counter" size="small">
        <n-statistic :label="t(`probes.counters.${counter.key}`)">
          <n-text :type="counter.warning && counter.value ? 'warning' : 'default'">
            {{ counter.value }}
          </n-text>
        </n-statistic>
      </n-card>
    </n-flex>

    <n-alert type="info">
      <template #icon>
        <app-icon name="info-square-rounded" />
      </template>
      {{ t("probes.collectionInfo") }}
    </n-alert>

    <app-spin :show="!groups.length">
      <app-masonry :items="groups" :min-column-width="380">
        <template #default="{ item: group }">
          <n-card :title="group.title" size="small">
            <template #header-extra>
              <n-text depth="3">{{ group.summary }}</n-text>
            </template>
            <n-list>
              <n-list-item v-for="row in group.rows" :key="row.entry.id">
                <n-thing :class="{ 'row-hidden': row.hidden }" :title="row.title">
                  <template #description>
                    <n-text code depth="3">{{ row.source }}</n-text>
                  </template>
                </n-thing>
                <template #suffix>
                  <n-flex :wrap="false" align="center" size="large">
                    <n-flex :size="2" align="end" class="row-value" vertical>
                      <n-text v-if="row.entry.available" strong>{{ row.value }}</n-text>
                      <n-tag v-else :bordered="false" round size="small" type="warning">
                        {{ t("charts.unavailable.tag") }}
                      </n-tag>
                      <n-text v-if="row.note" class="row-note" type="info">{{ row.note }}</n-text>
                    </n-flex>
                    <n-switch
                      :aria-label="t('probes.switchLabel', { name: row.title, group: group.title })"
                      :value="!row.hidden"
                      @update:value="setVisible(row.entry, $event)" />
                  </n-flex>
                </template>
              </n-list-item>
            </n-list>
          </n-card>
        </template>
      </app-masonry>
    </app-spin>
  </n-flex>
</template>

<style lang="sass" scoped>
.page-intro
  max-width: 40em

  h1
    margin: 0

.counter
  width: auto
  min-width: 11em

.row-hidden
  opacity: .55

// Le suffixe (valeur + interrupteur) garde sa largeur : c'est le libellé qui passe à la ligne
:deep(.n-list-item__suffix)
  flex-shrink: 0

.row-value
  text-align: right
  white-space: nowrap

.row-note
  font-size: .8em
</style>
