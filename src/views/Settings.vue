<script setup>
import AppMasonry from "@/components/AppMasonry.vue";
import InputSettings from "@/components/InputSettings.vue";
import AppIcon from "@/components/Utils/AppIcon.vue";
import settingsAvailable from "@/models/settingsAvailable";
import { useUserStore } from "@/stores/user";
import { useI18n } from "vue-i18n";

const user = useUserStore();
const { t } = useI18n();

function translateOptions(options) {
  return options?.map(({ labelKey, label, value }) => ({
    label: labelKey ? t(labelKey) : label,
    value,
  }));
}
</script>
<template>
  <n-flex vertical>
    <template v-for="mainSetting in settingsAvailable" :key="mainSetting.key">
      <template v-if="mainSetting.type === 'categ'">
        <n-h1 prefix="bar">{{ t(`settings.categories.${mainSetting.key}`) }}</n-h1>
        <!-- Colonnes équilibrées : pas d'espace vide sous les cartes plus courtes -->
        <app-masonry :items="mainSetting.children" item-key="key">
          <template #default="{ item: setting }">
            <n-card>
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
          </template>
        </app-masonry>
      </template>
    </template>
    <n-h1 prefix="bar" type="error">{{ t("settings.categories.danger") }}</n-h1>
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
  </n-flex>
</template>
<style lang="sass" scoped></style>
