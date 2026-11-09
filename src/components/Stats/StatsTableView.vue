<script setup>
import { NA, NFlex, NTag, NText } from "naive-ui";
import { computed, h, ref } from "vue";
import { useI18n } from "vue-i18n";

/**
 * Tableau : toutes les valeurs dans un seul tableau, comme l'ancienne page. Arborescence
 * composant → source de la lib → valeurs, avec l'unité dans sa propre colonne.
 */
const props = defineProps({
  sections: {
    type: Array,
    required: true,
  },
  showKeys: {
    type: Boolean,
    default: true,
  },
});

const { t } = useI18n();
const collapsed = ref(new Set());

const data = computed(() => {
  const components = [];

  props.sections.forEach(section => {
    let component = components.find(item => item.key === section.component);

    if (!component) {
      component = { key: section.component, kind: "component", children: [] };
      components.push(component);
    }
    component.children.push({
      key: section.id,
      kind: "source",
      fn: section.fn,
      title: section.title,
      doc: section.doc,
      children: section.rows.map(row => ({
        ...row,
        fieldKey: row.key,
        key: row.id,
        kind: "field",
      })),
    });
  });

  return components.map(component => {
    const rows = component.children.flatMap(source => source.children);

    return {
      ...component,
      count: rows.length,
      missing: rows.filter(row => row.missing).length,
    };
  });
});

const parentKeys = computed(() =>
  data.value.flatMap(component => [component.key, ...component.children.map(child => child.key)])
);
const expandedRowKeys = computed(() => parentKeys.value.filter(key => !collapsed.value.has(key)));
const totals = computed(() => ({
  count: data.value.reduce((total, component) => total + component.count, 0),
  missing: data.value.reduce((total, component) => total + component.missing, 0),
}));

function onExpandedChange(keys) {
  collapsed.value = new Set(parentKeys.value.filter(key => !keys.includes(key)));
}

function expandAll() {
  collapsed.value = new Set();
}

function collapseAll() {
  collapsed.value = new Set(data.value.map(component => component.key));
}

function renderName(row) {
  switch (row.kind) {
    case "component":
      return h(NFlex, { align: "center", size: "small", inline: true }, () => [
        h(NText, { strong: true }, () => t(`stats.components.${row.key}`)),
        h(NText, { depth: 3 }, () => t("stats.valueCount", { count: row.count }, row.count)),
        row.missing
          ? h(NTag, { size: "small", round: true, bordered: false }, () =>
              t("stats.missingCount", { count: row.missing }, row.missing)
            )
          : null,
      ]);
    case "source":
      return h(NFlex, { align: "center", size: "small", inline: true }, () => [
        h(NText, { code: true, type: "primary" }, () => row.fn),
        h(NText, { depth: 3 }, () => row.title),
        h(NA, { href: row.doc, target: "_blank" }, () => t("stats.documentation")),
      ]);
    default:
      return row.label;
  }
}

const columns = computed(() => {
  const list = [
    {
      title: t("stats.columns.name"),
      key: "label",
      minWidth: 220,
      render: renderName,
      // Les lignes de composant et de source occupent toute la largeur
      colSpan: row => (row.kind === "field" ? 1 : props.showKeys ? 4 : 3),
    },
  ];

  if (props.showKeys) {
    list.push({
      title: t("stats.columns.key"),
      key: "key",
      minWidth: 140,
      render: row =>
        row.kind === "field" ? h(NText, { code: true, depth: 3 }, () => row.fieldKey) : null,
    });
  }

  list.push(
    {
      title: t("stats.columns.value"),
      key: "value",
      align: "right",
      minWidth: 140,
      render: row => {
        if (row.kind !== "field") {
          return null;
        }
        if (row.missing) {
          return h(NTag, { size: "small", round: true, bordered: false }, () =>
            t("stats.notReported")
          );
        }
        return h(NFlex, { vertical: true, align: "end", size: 2 }, () => [
          h(NText, { strong: true, class: "table-number" }, () => row.number),
          row.note ? h(NText, { type: "info", class: "table-note" }, () => row.note) : null,
        ]);
      },
    },
    {
      title: t("stats.columns.unit"),
      key: "unit",
      width: 80,
      render: row => (row.kind !== "field" ? null : row.missing ? "—" : row.unit),
    }
  );

  return list;
});

function rowClassName(row) {
  return "row-" + row.kind;
}
</script>

<template>
  <n-flex vertical>
    <n-flex align="center" justify="space-between">
      <n-text depth="3">
        {{ t("stats.tableSummary", { count: totals.count, missing: totals.missing }) }}
      </n-text>
      <n-flex>
        <n-button size="small" @click="expandAll()">{{ t("stats.expandAll") }}</n-button>
        <n-button size="small" @click="collapseAll()">{{ t("stats.collapseAll") }}</n-button>
      </n-flex>
    </n-flex>
    <n-data-table
      :columns="columns"
      :data="data"
      :expanded-row-keys="expandedRowKeys"
      :indent="20"
      :row-class-name="rowClassName"
      :row-key="row => row.key"
      :scroll-x="640"
      children-key="children"
      size="small"
      @update:expanded-row-keys="onExpandedChange" />
  </n-flex>
</template>

<style lang="sass" scoped>
:deep(.row-component td)
  background-color: var(--n-th-color)

:deep(.table-number)
  font-variant-numeric: tabular-nums

:deep(.table-note)
  font-size: .8em
</style>
