<script setup>
import { useUserStore } from "@/stores/user";
import { useI18n } from "vue-i18n";

const user = useUserStore();
const { t } = useI18n();

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
    <n-h1>{{ t("probes.title") }}</n-h1>
    <n-flex>
      <n-card v-for="node in user.nodeAvailable" :key="node.labelKey" :title="t(node.labelKey)">
        <n-flex v-if="node.options">
          <div v-for="option in node.options" :key="option.labelKey" class="item">
            <n-flex v-if="user.nodeSelected">
              <n-text>{{ t(option.labelKey) }}</n-text>
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
