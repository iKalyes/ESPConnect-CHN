<template>
  <div class="nvs-inspector">
    <v-alert v-if="error" type="error" variant="tonal" density="comfortable" border="start" class="mb-3">
      {{ error }}
    </v-alert>

    <v-card variant="tonal" prepend-icon="mdi-database-search">
      <template v-slot:title>
        <span class="font-weight-black">NVS Inspector</span>
      </template>

      <v-card-text class="d-flex flex-column gap-4">
        <v-select
          :items="partitions"
          item-title="label"
          item-value="id"
          density="comfortable"
          label="Partition name"
          :model-value="selectedPartitionId"
          :disabled="loading || !partitions.length"
          @update:model-value="value => emit('select-partition', value)"
        />

        <div class="nvs-inspector__controls">
          <v-btn color="primary" variant="tonal" :disabled="loading || !hasPartitionSelected" @click="emit('read-nvs')">
            <v-icon start>mdi-database-sync</v-icon>
            Read NVS
          </v-btn>

          <v-spacer />

          <div v-if="result" class="nvs-inspector__summary">
            <v-chip size="small" variant="outlined" color="primary">
              <v-icon start size="18">mdi-information-outline</v-icon>
              NVS v{{ result.version }}
            </v-chip>

            <v-tooltip
              :text="`total: ${pageStats.total.toLocaleString()} \u00b7 in-use: ${pageStats.inUse.toLocaleString()} \u00b7 blank: ${pageStats.blank.toLocaleString()} \u00b7 bad: ${pageStats.bad.toLocaleString()}`"
              location="bottom"
            >
              <template #activator="{ props: tooltipProps }">
                <v-chip v-bind="tooltipProps" size="small" variant="outlined" color="secondary">
                  <v-icon start size="18">mdi-book-open-page-variant</v-icon>
                  {{ result.pages.length.toLocaleString() }} pages
                </v-chip>
              </template>
            </v-tooltip>

            <v-chip size="small" variant="outlined" color="secondary">
              <v-icon start size="18">mdi-folder-key-outline</v-icon>
              {{ result.namespaces.length.toLocaleString() }} namespaces
            </v-chip>

            <v-chip size="small" variant="outlined" color="secondary">
              <v-icon start size="18">mdi-key-outline</v-icon>
              {{ result.entries.length.toLocaleString() }} entries
            </v-chip>
          </div>
        </div>

        <v-progress-linear v-if="loading" height="10" indeterminate color="primary" rounded />

      </v-card-text>
    </v-card>

    <div class="mt-6 d-flex flex-column gap-4">
      <v-tabs v-model="activeTab" density="comfortable" color="primary">
        <v-tab value="keys">Keys</v-tab>
        <v-tab value="pages">Pages</v-tab>
      </v-tabs>

      <v-window v-model="activeTab">
        <v-window-item value="keys">
          <div class="d-flex flex-column gap-4">
            <v-alert v-if="!result" type="info" variant="tonal" border="start">
              Read NVS to see keys.
            </v-alert>

            <template v-else>
              <v-card variant="tonal">
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Keys</span>
          <v-chip size="large" variant="outlined" color="primary">
            {{ filteredEntries.length.toLocaleString() }} shown
          </v-chip>
        </v-card-title>

        <v-card-text>
          <div class="nvs-inspector__filters">
            <v-select
              v-model="namespaceFilter"
              :items="namespaceFilterOptions"
              density="comfortable"
              label="Namespace"
              variant="outlined"
              hide-details
              class="nvs-inspector__filter"
            />
            <v-text-field
              v-model="keyFilter"
              density="comfortable"
              label="Key"
              variant="outlined"
              clearable
              hide-details
              prepend-inner-icon="mdi-magnify"
              class="nvs-inspector__filter"
            />
            <v-select
              v-model="typeFilter"
              :items="typeFilterOptions"
              density="comfortable"
              label="Type"
              variant="outlined"
              hide-details
              class="nvs-inspector__filter"
            />
            <v-text-field
              v-model="valueFilter"
              density="comfortable"
              label="Value preview"
              variant="outlined"
              clearable
              hide-details
              class="nvs-inspector__filter"
            />
          </div>

          <v-data-table
            :headers="headers"
            :items="filteredEntries"
            item-key="__key"
            density="compact"
            class="nvs-inspector__table mt-4"
          >
            <template #item.namespace="{ item }">
              <code>{{ unwrapItem(item).namespace }}</code>
            </template>

            <template #item.key="{ item }">
              <code>{{ unwrapItem(item).key }}</code>
            </template>

            <template #item.type="{ item }">
              <v-chip size="small" variant="tonal" color="secondary">{{ unwrapItem(item).type }}</v-chip>
            </template>

            <template #item.valuePreview="{ item }">
              <code>{{ unwrapItem(item).valuePreview }}</code>
            </template>

            <template #item.length="{ item }">
              <span v-if="typeof unwrapItem(item).length === 'number'">
                {{ unwrapItem(item).length.toLocaleString() }}
              </span>
              <span v-else class="text-medium-emphasis">—</span>
            </template>

            <template #item.crcOk="{ item }">
              <v-chip v-if="unwrapItem(item).crcOk === true" size="small" color="success" variant="tonal">OK</v-chip>
              <v-chip v-else-if="unwrapItem(item).crcOk === false" size="small" color="error" variant="tonal"
                >BAD</v-chip
              >
              <span v-else class="text-medium-emphasis">—</span>
            </template>

            <!-- FIX: parser now uses `location`, not `raw` -->
            <template #item.location="{ item }">
              <span v-if="unwrapItem(item).location" class="text-caption">
                <code>p{{ unwrapItem(item).location.pageIndex }}:e{{ unwrapItem(item).location.entryIndex }}</code>
              </span>
              <span v-else class="text-medium-emphasis">—</span>
            </template>

            <template #item.issues="{ item }">
              <v-chip v-if="unwrapItem(item).warnings?.length" size="small" color="warning" variant="tonal">
                {{ unwrapItem(item).warnings.length }}
              </v-chip>
              <span v-else class="text-medium-emphasis">—</span>
            </template>

            <template #no-data>
              <v-alert type="info" variant="tonal" border="start">No entries match the current filters.</v-alert>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>

      <v-expansion-panels v-if="result.errors.length || result.warnings.length" variant="accordion">
        <v-expansion-panel>
          <v-expansion-panel-title>
            Warnings / Errors
            <v-spacer />
            <v-chip v-if="result.errors.length" size="small" color="error" variant="tonal" class="ml-2">
              {{ result.errors.length }}
            </v-chip>
            <v-chip v-if="result.warnings.length" size="small" color="warning" variant="tonal" class="ml-2">
              {{ result.warnings.length }}
            </v-chip>
          </v-expansion-panel-title>

          <v-expansion-panel-text>
            <div v-if="result.errors.length" class="mb-4">
              <div class="text-overline text-medium-emphasis mb-2">Errors</div>
              <ul class="nvs-inspector__list">
                <li v-for="(line, idx) in result.errors" :key="'e-' + idx"><code>{{ line }}</code></li>
              </ul>
            </div>

            <div v-if="result.warnings.length">
              <div class="text-overline text-medium-emphasis mb-2">Warnings</div>
              <ul class="nvs-inspector__list">
                <li v-for="(line, idx) in result.warnings" :key="'w-' + idx"><code>{{ line }}</code></li>
              </ul>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
            </template>
          </div>
        </v-window-item>

        <v-window-item value="pages">
          <div class="d-flex flex-column gap-4">
            <v-alert v-if="!result" type="info" variant="tonal" border="start">
              Read NVS to see pages.
            </v-alert>

            <v-card v-else variant="tonal">
              <v-card-title class="nvs-inspector__pages-title">
                <span>Pages</span>
                <v-chip size="small" variant="tonal" color="primary" class="nvs-inspector__pages-summary">
                  total: {{ pageStats.total.toLocaleString() }}
                  <span class="text-medium-emphasis">&middot;</span>
                  in-use: {{ pageStats.inUse.toLocaleString() }}
                  <span class="text-medium-emphasis">&middot;</span>
                  blank: {{ pageStats.blank.toLocaleString() }}
                  <span class="text-medium-emphasis">&middot;</span>
                  bad: {{ pageStats.bad.toLocaleString() }}
                </v-chip>
              </v-card-title>

              <v-card-text>
                <v-table density="compact" class="nvs-inspector__pages-table">
                  <thead>
                    <tr>
                      <th class="text-start">Page #</th>
                      <th class="text-start">State</th>
                      <th class="text-end">Seq</th>
                      <th class="text-center">Status</th>
                      <th class="text-end">Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="page in result.pages" :key="page.index">
                      <td><code>{{ page.index }}</code></td>
                      <td><code>{{ page.state }}</code></td>
                      <td class="text-end">
                        <span
                          v-if="
                            page.state !== 'UNINITIALIZED' &&
                            typeof page.seq === 'number' &&
                            page.seq !== 0xffffffff
                          "
                        >
                          {{ page.seq.toLocaleString() }}
                        </span>
                        <span v-else class="text-medium-emphasis">&mdash;</span>
                      </td>
                      <td class="text-center">
                        <v-chip v-if="page.state === 'UNINITIALIZED'" size="small" color="grey-darken-1" variant="tonal"
                          >Blank</v-chip
                        >
                        <v-chip v-else-if="page.valid" size="small" color="success" variant="tonal">OK</v-chip>
                        <v-chip v-else size="small" color="error" variant="tonal">BAD</v-chip>
                      </td>
                      <td class="text-end">
                        <v-chip v-if="page.errors.length" size="small" color="error" variant="tonal">
                          {{ page.errors.length }}
                        </v-chip>
                        <span v-else class="text-medium-emphasis">0</span>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </v-card-text>
            </v-card>
          </div>
        </v-window-item>
      </v-window>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { DataTableHeader } from 'vuetify';

type PartitionOption = {
  id: number | string;
  label: string;
  offset: number;
  size: number;
  sizeText?: string;
};

type NvsLocation = {
  pageIndex: number;
  entryIndex: number;
  spanCount?: number;
  nsIndex?: number;
  typeCode?: number;
  chunkIndex?: number;
  declaredDataSize?: number;
  headerCrcOk?: boolean;
  itemCrcOk?: boolean;
  dataCrcOk?: boolean;
};

type NvsEntry = {
  namespace: string;
  key: string;
  type: string;
  valuePreview: string;
  length?: number;
  crcOk?: boolean;
  location?: NvsLocation; // FIX: matches parser output
  warnings?: string[];
};

type NvsPage = {
  index: number;
  state: string;
  seq: number | null;
  valid: boolean;
  errors: string[];
};

type NvsResult = {
  version: number;
  pages: NvsPage[];
  namespaces: Array<unknown>;
  entries: Array<NvsEntry>;
  warnings: string[];
  errors: string[];
};

const props = defineProps<{
  partitions: PartitionOption[];
  selectedPartitionId: number | string | null;
  loading: boolean;
  status: string;
  error: string | null;
  result: NvsResult | null;
  hasPartition: boolean;
}>();

const emit = defineEmits<{
  (e: 'select-partition', value: number | string | null): void;
  (e: 'read-nvs'): void;
}>();

type ResultTab = 'keys' | 'pages';
const activeTab = ref<ResultTab>('pages');
watch(
  () => props.result,
  result => {
    activeTab.value = result?.entries?.length ? 'keys' : 'pages';
  },
  { immediate: true },
);

const autoReadRequested = ref(false);
watch(
  [() => props.partitions.length, () => props.loading, () => props.result],
  ([partitionCount, loading, result]) => {
    if (autoReadRequested.value) return;
    if (loading) return;
    if (result) {
      autoReadRequested.value = true;
      return;
    }
    if (partitionCount <= 0) return;
    autoReadRequested.value = true;
    emit('read-nvs');
  },
  { immediate: true },
);

const namespaceFilter = ref('All');
const keyFilter = ref('');
const typeFilter = ref('All');
const valueFilter = ref('');

const headers: DataTableHeader[] = [
  { title: 'Namespace', key: 'namespace' },
  { title: 'Key', key: 'key' },
  { title: 'Type', key: 'type' },
  { title: 'Value', key: 'valuePreview' },
  { title: 'Length', key: 'length', align: 'end' },
  { title: 'CRC', key: 'crcOk', align: 'center' },
  { title: 'Location', key: 'location' },
  { title: 'Issues', key: 'issues', align: 'center' },
];

// FIX: avoid shadowing props.hasPartition with a computed of the same name
const hasPartitionSelected = computed(() => props.hasPartition && Boolean(props.selectedPartitionId));

const pageStats = computed(() => {
  const pages = props.result?.pages ?? [];

  let blank = 0;
  let bad = 0;
  for (const page of pages) {
    if (!page) continue;
    if (page.state === 'UNINITIALIZED') {
      blank += 1;
      continue;
    }
    if (!page.valid) {
      bad += 1;
    }
  }

  const total = pages.length;
  const inUse = Math.max(total - blank, 0);
  return { total, inUse, blank, bad };
});

function unwrapItem(item: unknown) {
  // Vuetify wraps items; keep defensive to avoid UI crashes on malformed data.
  // In Vuetify 3, item may be either the raw object or a wrapper with `.raw`.
  return ((item as any)?.raw ?? item) as any;
}

const namespaceFilterOptions = computed(() => {
  const items = props.result?.entries ?? [];
  const set = new Set<string>();
  for (const entry of items) {
    if (entry?.namespace) set.add(entry.namespace);
  }
  return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
});

const typeFilterOptions = computed(() => {
  const items = props.result?.entries ?? [];
  const set = new Set<string>();
  for (const entry of items) {
    if (entry?.type) set.add(entry.type);
  }
  return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
});

const filteredEntries = computed(() => {
  const result = props.result;
  if (!result) return [];

  const ns = namespaceFilter.value;
  const key = keyFilter.value.trim().toLowerCase();
  const type = typeFilter.value;
  const value = valueFilter.value.trim().toLowerCase();

  return (result.entries ?? [])
    .map((entry, idx) => ({
      ...entry,
      __key: `${entry.namespace}:${entry.key}:${entry.type}:${idx}`,
    }))
    .filter(entry => {
      if (ns !== 'All' && entry.namespace !== ns) return false;
      if (type !== 'All' && entry.type !== type) return false;
      if (key && !String(entry.key ?? '').toLowerCase().includes(key)) return false;
      if (value && !String(entry.valuePreview ?? '').toLowerCase().includes(value)) return false;
      return true;
    });
});
</script>

<style scoped>
.nvs-inspector__controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.nvs-inspector__summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

.nvs-inspector__filters {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 900px) {
  .nvs-inspector__filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 500px) {
  .nvs-inspector__filters {
    grid-template-columns: 1fr;
  }
}

.nvs-inspector__list {
  margin: 0;
  padding-left: 18px;
}

.nvs-inspector__pages-table code {
  font-size: 0.85rem;
}

.nvs-inspector__pages-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.nvs-inspector__pages-summary {
  max-width: 100%;
}

.nvs-inspector__pages-summary :deep(.v-chip__content) {
  white-space: normal;
}
</style>
