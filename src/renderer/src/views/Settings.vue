<script setup>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import InputSettings from "@renderer/components/InputSettings.vue";
import settingsAvailable from "@renderer/models/settingsAvailable";
import { useUserStore } from "@renderer/stores/user";

const user = useUserStore();

function onSwitchClick(option, value) {
  if (value) {
    user.useNode(option);
  } else {
    user.unuseNode(option);
  }
}
</script>
<template>
  <n-layout bordered>
    <n-h1>Paramètres</n-h1>
    <n-flex>
      <n-card v-for="setting in settingsAvailable" :key="setting.label">
        <template #header>
          <n-thing>
            <template v-if="setting.icon" #avatar>
              <font-awesome-icon :icon="['fas', setting.icon]" />
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
            :options="setting.options"
            :path="setting.storePath"
            :store="user"
            :type="setting.type" />
        </template>
      </n-card>
    </n-flex>
    <n-h1>Nœuds de données</n-h1>
    <n-flex>
      <n-card v-for="node in user.nodeAvailable" :key="node.apiKey" :title="node.label">
        <n-flex v-if="node.options">
          <div
            v-for="option in node.options"
            :key="option.apiKey + '#' + option.value"
            class="item">
            <n-flex v-if="user.nodeSelected">
              <n-text>{{ option.label }}</n-text>
              <n-switch
                :value="user.nodeSelected.includes(user.getNodeString(option))"
                @update:value="onSwitchClick(option, $event)" />
            </n-flex>
          </div>
        </n-flex>
        <template #header-extra>
          <n-switch
            v-if="node.apiKey"
            :value="user.nodeSelected.includes(user.getNodeString(node))"
            @update:value="onSwitchClick(node, $event)" />
        </template>
      </n-card>
    </n-flex>
  </n-layout>
</template>
<style lang="sass" scoped></style>
