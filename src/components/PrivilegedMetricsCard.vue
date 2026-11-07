<script setup>
import { currentPlatform } from "@/api/app";
import metricsApi from "@/api/metrics";
import AppIcon from "@/components/Utils/AppIcon.vue";
import privilegedMetrics from "@/models/privilegedMetrics";
import { useSystemStore } from "@/stores/system";
import { useMessage } from "naive-ui";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const system = useSystemStore();
const message = useMessage();
const { t } = useI18n();

// Autre système (non prévu) : traité comme Linux, sans option
const platformKey = privilegedMetrics[currentPlatform] ? currentPlatform : "linux";
const platform = privilegedMetrics[platformKey];
const status = ref(null);
const loading = ref(false);

const enabled = computed(() => Boolean(status.value?.enabled));

const metrics = computed(() =>
  platform.metrics.map(({ key, isAvailable }) => ({
    key,
    available: isAvailable(system.metrics ?? {}),
  }))
);
const missingCount = computed(() => metrics.value.filter(metric => !metric.available).length);

/** Verdict affiché : l'option vaut-elle le coup sur cette machine ? */
const verdict = computed(() => {
  if (platform.usefulness === "none") {
    return { type: "success", text: t("settings.privileged.verdict.notNeeded") };
  }
  if (platform.usefulness === "low") {
    return { type: "warning", text: t("settings.privileged.verdict.low") };
  }
  if (enabled.value) {
    return { type: "success", text: t("settings.privileged.verdict.active") };
  }
  if (missingCount.value === 0) {
    return { type: "success", text: t("settings.privileged.verdict.alreadyAvailable") };
  }
  return {
    type: "info",
    text: t("settings.privileged.verdict.useful", { count: missingCount.value }),
  };
});

async function refreshStatus() {
  try {
    status.value = await metricsApi.privilegedStatus();
  } catch (error) {
    console.error("[privileged]", error);
  }
}

async function toggle() {
  loading.value = true;

  try {
    status.value = enabled.value
      ? await metricsApi.privilegedDisable()
      : await metricsApi.privilegedEnable();
    message.success(
      t(
        enabled.value ? "settings.privileged.enabledMessage" : "settings.privileged.disabledMessage"
      )
    );
  } catch (error) {
    if (error?.message !== "canceled") {
      message.error(t("settings.privileged.error", { error: error?.message ?? error }));
    }
    await refreshStatus();
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (platform.switchable) {
    refreshStatus();
  }
});
</script>

<template>
  <n-card>
    <template #header>
      <n-thing>
        <template #avatar>
          <app-icon name="shield-lock" size="1.5em" />
        </template>
        <template #header>{{ t("settings.privileged.label") }}</template>
        <template #description>{{ t("settings.privileged.description") }}</template>
      </n-thing>
    </template>
    <template v-if="platform.switchable" #header-extra>
      <n-popconfirm
        :negative-button-props="{ secondary: true }"
        :positive-button-props="{ type: enabled ? 'primary' : 'error' }"
        :show-icon="false"
        @positive-click="toggle()">
        <template #trigger>
          <n-switch :disabled="!status" :loading="loading" :value="enabled" />
        </template>
        <template #default>
          <n-flex vertical style="max-width: 28em">
            <template v-if="enabled">
              <n-text>{{ t("settings.privileged.confirmDisable", { file: status?.file }) }}</n-text>
            </template>
            <template v-else>
              <n-text>{{ t("settings.privileged.confirmEnable", { file: status?.file }) }}</n-text>
              <n-text code>{{ status?.rule }}</n-text>
              <n-text depth="3">{{ t("settings.privileged.confirmPassword") }}</n-text>
            </template>
          </n-flex>
        </template>
      </n-popconfirm>
    </template>
    <template #default>
      <n-flex vertical>
        <n-alert :type="verdict.type">{{ verdict.text }}</n-alert>
        <n-table v-if="metrics.length" :bordered="false" size="small">
          <thead>
            <tr>
              <th>{{ t("settings.privileged.columns.metric") }}</th>
              <th>{{ t("settings.privileged.columns.now") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="metric in metrics" :key="metric.key">
              <td>{{ t(`settings.privileged.metrics.${metric.key}`) }}</td>
              <td>
                <n-flex align="center" size="small">
                  <app-icon :name="metric.available ? 'circle-check' : 'circle-x'" />
                  {{
                    t(
                      metric.available
                        ? "settings.privileged.available"
                        : "settings.privileged.unavailable"
                    )
                  }}
                </n-flex>
              </td>
            </tr>
          </tbody>
        </n-table>
        <n-text depth="3">{{ t(`settings.privileged.details.${platformKey}`) }}</n-text>
      </n-flex>
    </template>
  </n-card>
</template>
