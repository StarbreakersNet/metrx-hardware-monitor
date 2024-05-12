<script setup>
import { computed } from "vue";

const props = defineProps({
  type: {
    type: String,
    validator() {
      return true;
    },
  },
  options: {
    type: Array,
  },
  store: {
    type: Object,
    required: true,
  },
  path: {
    type: Array,
    required: true,
  },
});

function getValueByPath(store, path) {
  // Utilisation de reduce pour naviguer à travers le store en suivant le path
  // On retourne la valeur à la fin du chemin
  return path.reduce((currentObject, key) => {
    // À chaque itération, on prend l'objet actuel et la clé suivante dans le chemin
    // puis on retourne l'objet suivant dans le chemin
    return currentObject[key];
  }, store);
}

function setValueByPath(store, path, value) {
  // Copie du chemin sans la dernière clé
  let pathWithoutLastKey = path.slice(0, -1);

  // Utilisation de reduce pour naviguer jusqu'à l'objet parent de la dernière clé
  let parentObject = pathWithoutLastKey.reduce((currentObject, key) => {
    return currentObject[key];
  }, store);

  // Récupération de la dernière clé
  let lastKey = path[path.length - 1];

  // Assignation de la nouvelle valeur à la dernière clé de l'objet parent
  parentObject[lastKey] = value;
}

function updateValue(newValue) {
  value.value = newValue;
}

const value = computed({
  get() {
    return getValueByPath(props.store, props.path);
  },
  set(newValue) {
    setValueByPath(props.store, props.path, newValue);
  },
});
</script>

<template>
  <n-select
    v-if="type === 'select'"
    :options="options"
    :value="value"
    filterable
    @update:value="updateValue($event)" />
  <n-input-number
    v-else-if="type === 'number'"
    :value="value"
    min="1"
    @update:value="updateValue($event)" />
  <n-switch v-else-if="type === 'switch'" :value="value" @update:value="updateValue($event)" />
</template>

<style lang="sass" scoped></style>
