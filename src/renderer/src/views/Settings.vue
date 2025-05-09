<script setup>
import InputSettings from "@renderer/components/InputSettings.vue";
import AppIcon from "@renderer/components/Utils/AppIcon.vue";
import settingsAvailable from "@renderer/models/settingsAvailable";
import { useUserStore } from "@renderer/stores/user";

const user = useUserStore();
</script>
<template>
  <n-layout bordered>
    <template v-for="mainSetting in settingsAvailable" :key="mainSetting.label">
      <template v-if="mainSetting.type === 'categ'">
        <n-h1 prefix="bar">{{ mainSetting.label }}</n-h1>
        <n-flex>
          <n-card v-for="setting in mainSetting.children" :key="setting.label">
            <template #header>
              <n-thing>
                <template v-if="setting.icon" #avatar>
                  <app-icon :name="setting.icon" size="1.5em" />
                </template>
                <template #header>
                  {{ setting.label }}
                </template>
                <template #description>
                  {{ setting.description }}
                </template>
              </n-thing>
            </template>
            <template #header-extra>
              <input-settings
                :max="setting.max"
                :min="setting.min"
                :options="setting.options"
                :path="setting.storePath"
                :store="user"
                :type="setting.type" />
            </template>
          </n-card>
        </n-flex>
      </template>
    </template>
    <n-h1 prefix="bar" type="error">Zone de danger</n-h1>
    <n-flex vertical>
      <n-alert :show-icon="false" type="info">
        Permet de restaurer
        <strong>tous les paramètres de l'application</strong>
        à leurs valeurs
        <strong>par défaut</strong>
        , y compris les
        <strong>configurations des graphiques</strong>
        . Cette réinitialisation peut être utile lorsque vous rencontrez des problèmes d'affichage
        ou des comportements inattendus dans l'interface après une mise à jour. Si c'est le cas,
        cette option vous permet de repartir sur une base saine.
      </n-alert>
      <n-popconfirm
        :negative-button-props="{ secondary: true }"
        :positive-button-props="{ type: 'error' }"
        @positive-click="user.resetAllSettings()">
        <template #trigger>
          <n-button secondary type="error">Réinitialiser tous les paramètres</n-button>
        </template>
        <template #default>
          <n-text>Êtes-vous sûr de vouloir réinitialiser tous vos paramètres ?</n-text>
        </template>
      </n-popconfirm>
    </n-flex>
  </n-layout>
</template>
<style lang="sass" scoped></style>
