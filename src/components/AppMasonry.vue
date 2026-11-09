<script setup>
/**
 * Cartes en colonnes équilibrées, sans espace vide sous les cartes plus courtes que leurs voisines
 * (une grille aligne les rangées sur la carte la plus haute).
 *
 * Chaque carte va, dans l'ordre, dans la colonne la moins haute ; les hauteurs sont mesurées.
 * Quand la place manque pour plusieurs colonnes, les cartes restent dans leur ordre, l'une sous
 * l'autre.
 */
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";

const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  itemKey: {
    type: String,
    default: "id",
  },
  // Largeur minimale d'une colonne (px) et nombre maximal de colonnes
  minColumnWidth: {
    type: Number,
    default: 420,
  },
  maxColumns: {
    type: Number,
    default: 2,
  },
  gap: {
    type: Number,
    default: 16,
  },
});

const container = ref(null);
const width = ref(0);
const heights = reactive({});
const elements = new Map();

const columnCount = computed(() => {
  const fitting = Math.floor((width.value + props.gap) / (props.minColumnWidth + props.gap));

  return Math.max(1, Math.min(props.maxColumns, fitting, props.items.length));
});

const columns = computed(() => {
  const result = Array.from({ length: columnCount.value }, () => ({ items: [], height: 0 }));

  props.items.forEach(item => {
    const target = result.reduce((best, column) => (column.height < best.height ? column : best));

    target.items.push(item);
    target.height += (heights[item[props.itemKey]] ?? 1) + props.gap;
  });

  return result;
});

const itemObserver = new ResizeObserver(entries => {
  entries.forEach(entry => {
    const key = entry.target.dataset.masonryKey;
    const height = Math.round(entry.contentRect.height);

    if (heights[key] !== height) {
      heights[key] = height;
    }
  });
});

const containerObserver = new ResizeObserver(([entry]) => {
  width.value = entry.contentRect.width;
});

function setItemRef(key, element) {
  const previous = elements.get(key);

  if (previous === element) {
    return;
  }
  if (previous) {
    itemObserver.unobserve(previous);
  }
  if (element) {
    elements.set(key, element);
    itemObserver.observe(element);
  } else {
    elements.delete(key);
  }
}

watch(
  () => props.items.map(item => item[props.itemKey]),
  keys => {
    Object.keys(heights)
      .filter(key => !keys.includes(key))
      .forEach(key => delete heights[key]);
  }
);

onMounted(() => {
  containerObserver.observe(container.value);
});

onBeforeUnmount(() => {
  containerObserver.disconnect();
  itemObserver.disconnect();
});
</script>

<template>
  <div ref="container">
    <n-flex :size="props.gap" :wrap="false" align="start">
      <n-flex
        v-for="(column, index) in columns"
        :key="index"
        :size="props.gap"
        class="masonry-column"
        vertical>
        <div
          v-for="item in column.items"
          :key="item[props.itemKey]"
          :ref="element => setItemRef(String(item[props.itemKey]), element)"
          :data-masonry-key="item[props.itemKey]">
          <slot :item="item" />
        </div>
      </n-flex>
    </n-flex>
  </div>
</template>

<style lang="sass" scoped>
.masonry-column
  flex: 1 1 0
  min-width: 0
</style>
