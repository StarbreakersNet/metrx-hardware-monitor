<script setup>
import InputSettings from "@/components/InputSettings.vue";
import AppIcon from "@/components/Utils/AppIcon.vue";
import settingsAvailable from "@/models/settingsAvailable";
import { useUserStore } from "@/stores/user";
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const user = useUserStore();
const { t } = useI18n();

const categories = settingsAvailable.filter(setting => setting.type === "categ");
const tab = ref(categories[0]?.key);

function translateOptions(options) {
  return options?.map(({ labelKey, label, value }) => ({
    label: labelKey ? t(labelKey) : label,
    value,
  }));
}
</script>
<template>
  <!-- Une section par onglet, les réglages sur une seule colonne : sur deux colonnes, les libellés
       et les descriptions n'avaient plus la place de tenir à côté du champ -->
  <n-tabs v-model:value="tab" animated type="line">
    <n-tab-pane
      v-for="mainSetting in categories"
      :key="mainSetting.key"
      :name="mainSetting.key"
      :tab="t(`settings.categories.${mainSetting.key}`)">
      <n-flex vertical>
        <n-card v-for="setting in mainSetting.children" :key="setting.key">
          <template #header>
            <n-thing>
              <template v-if="setting.icon" #avatar>
                <app-icon :name="setting.icon" size="1.5em" />
              </template>
              <template #header>
                <n-flex align="center">
                  {{ t(`settings.items.${setting.key}.label`) }}
                </n-flex>
              </template>
              <template #description>
                {{ t(`settings.items.${setting.key}.description`) }}
              </template>
            </n-thing>
          </template>
          <template #header-extra>
            <input-settings
              :max="setting.max"
              :min="setting.min"
              :options="translateOptions(setting.options)"
              :path="setting.storePath"
              :store="user"
              :type="setting.type" />
          </template>
          <template v-if="setting.info" #default>
            <transition name="insert">
              <n-alert type="info">
                <template #icon>
                  <app-icon name="info-square-rounded" />
                </template>
                <template #default>
                  {{ t(`settings.items.${setting.key}.info`) }}
                </template>
              </n-alert>
            </transition>
          </template>
        </n-card>
      </n-flex>
    </n-tab-pane>
    <n-tab-pane :tab="t('settings.categories.danger')" name="danger">
      <n-flex vertical>
        <n-alert :show-icon="false" type="info">
          <i18n-t keypath="settings.reset.info" scope="global" tag="span">
            <template #allSettings>
              <strong>{{ t("settings.reset.allSettings") }}</strong>
            </template>
            <template #defaults>
              <strong>{{ t("settings.reset.defaults") }}</strong>
            </template>
            <template #charts>
              <strong>{{ t("settings.reset.charts") }}</strong>
            </template>
          </i18n-t>
        </n-alert>
        <n-popconfirm
          :negative-button-props="{ secondary: true }"
          :positive-button-props="{ type: 'error' }"
          @positive-click="user.resetAllSettings()">
          <template #trigger>
            <n-button secondary type="error">{{ t("settings.reset.button") }}</n-button>
          </template>
          <template #default>
            <n-text>{{ t("settings.reset.confirm") }}</n-text>
          </template>
        </n-popconfirm>
      </n-flex>
    </n-tab-pane>
  </n-tabs>
</template>
<style lang="sass" scoped></style>
