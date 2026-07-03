<template>
  <q-page padding class="bg-grey-1">
    <div class="row q-col-gutter-md justify-center">
      <div class="col-12 col-md-11 flex justify-between items-center q-mb-md">
        <div>
          <h1 class="text-h5 q-my-none text-weight-bold text-primary">Laporan Jurnal</h1>
          <div class="text-caption text-grey-7">Daftar entri jurnal pembukuan sistem</div>
        </div>
        <div class="row q-gutter-sm">
          <q-btn color="positive" icon="table_view" label="Export Excel" @click="exportTable" unelevated />
          <q-btn color="primary" icon="refresh" label="Muat Ulang" @click="fetchData" :loading="loading" unelevated />
        </div>
      </div>

      <!-- Collapsible Filters -->
      <div class="col-12 col-md-11">
        <q-expansion-item
          v-model="filterExpanded"
          expand-separator
          icon="filter_alt"
          label="Filter Laporan"
          class="bg-white rounded-lg shadow-sm q-mb-sm overflow-hidden"
          header-class="text-weight-bold text-primary"
          :dense="$q.screen.lt.md"
          :default-opened="$q.screen.gt.sm"
        >
          <q-card flat class="bg-white">
            <q-card-section class="q-pa-md">
              <div class="row q-col-gutter-sm items-end">
                <div class="col-12 col-sm-2">
                  <q-input v-model="filters.startDate" label="Tanggal Mulai" type="date" filled dense />
                </div>
                <div class="col-12 col-sm-2">
                  <q-input v-model="filters.endDate" label="Tanggal Selesai" type="date" filled dense />
                </div>
                <div class="col-12 col-sm-2">
                  <q-select
                    v-model="filters.dana"
                    :options="['ZAKAT', 'INFAK', 'INFAK_KHUSUS','QURBAN', 'DSKL', 'WAKAF']"
                    label="Jenis Dana"
                    filled
                    dense
                    clearable
                  />
                </div>
                <div class="col-12 col-sm-3">
                  <q-select
                    v-model="filters.office"
                    :options="hierarchicalOffices"
                    option-label="kantor_label"
                    option-value="officeid"
                    emit-value
                    map-options
                    label="Kantor"
                    filled
                    dense
                    clearable
                  >
                    <template v-slot:option="scope">
                      <q-item v-bind="scope.itemProps">
                        <q-item-section>
                          <q-item-label :style="{ paddingLeft: (scope.opt.level * 16) + 'px' }" :class="{ 'text-weight-bold': scope.opt.level === 0 }">
                            {{ scope.opt.kantor_label }}
                          </q-item-label>
                          <q-item-label caption :style="{ paddingLeft: (scope.opt.level * 16) + 'px' }">{{ scope.opt.officeid }}</q-item-label>
                        </q-item-section>
                      </q-item>
                    </template>
                  </q-select>
                </div>
                <div class="col-12 col-sm-3">
                   <q-input v-model="filters.search" label="Cari Keterangan/ID..." filled dense clearable debounce="500">
                    <template v-slot:prepend>
                      <q-icon name="search" size="xs" />
                    </template>
                  </q-input>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </q-expansion-item>
      </div>

      <!-- Table Section -->
      <div class="col-12 col-md-11">
        <q-table
          :rows="rows"
          :columns="uiColumns"
          row-key="id"
          :loading="loading"
          flat
          bordered
          class="bg-white rounded-lg shadow-1 sticky-header-table"
          :pagination="{ rowsPerPage: 100 }"
        >
          <template v-slot:body="props">
            <!-- Transaction Reference Header (Grouping) -->
            <q-tr v-if="isNewGroup(props.rowIndex)" class="bg-blue-grey-1">
              <q-td colspan="6" class="text-weight-bold">
                <q-icon name="tag" class="q-mr-xs" />
                REF: {{ props.row.transid }} | Tgl: {{ date.formatDate(props.row.tgl, 'DD/MM/YYYY') }}
              </q-td>
            </q-tr>
            
            <q-tr :props="props">
              <q-td key="tgl" :props="props">
                {{ date.formatDate(props.row.tgl, 'DD/MM/YY') }}
              </q-td>
              <q-td key="transid" :props="props" class="text-grey-7">
                {{ props.row.transid }}
              </q-td>
              <q-td key="perkiraan" :props="props">
                <div class="text-weight-medium">{{ props.row.perkiraan }} - {{ props.row.nama_perkiraan }}</div>
              </q-td>
              <q-td key="keterangan" :props="props" class="text-caption">
                <div class="ellipsis-2-lines">{{ props.row.keterangan }}</div>
              </q-td>
              <q-td key="debit" :props="props" class="text-right text-weight-bold text-positive">
                {{ props.row.debit > 0 ? formatCurrency(props.row.debit) : '-' }}
              </q-td>
              <q-td key="kredit" :props="props" class="text-right text-weight-bold text-negative">
                {{ props.row.kredit > 0 ? formatCurrency(props.row.kredit) : '-' }}
              </q-td>
            </q-tr>
          </template>

          <template v-slot:bottom-row v-if="rows.length > 0">
            <q-tr class="bg-grey-2 text-weight-bold">
              <q-td colspan="4" class="text-right">TOTAL HALAMAN INI</q-td>
              <q-td class="text-right text-positive">{{ formatCurrency(totalDebit) }}</q-td>
              <q-td class="text-right text-negative">{{ formatCurrency(totalKredit) }}</q-td>
            </q-tr>
          </template>
        </q-table>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { api } from 'src/api'
import { date, exportFile, useQuasar } from 'quasar'

const $q = useQuasar()
const loading = ref(false)
const rows = ref([])
const offices = ref([])

const filterExpanded = ref($q.screen.gt.sm)
const filters = ref({
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
  search: '',
  office: null,
  dana: null
})

const hierarchicalOffices = computed(() => {
  const sorted = [...offices.value].sort((a, b) => a.officeid.localeCompare(b.officeid))
  return sorted.map(office => {
    const level = sorted.filter(parent => 
      office.officeid !== parent.officeid && 
      office.officeid.startsWith(parent.officeid)
    ).length
    return { ...office, level, kantor_label: `${office.officeid} - ${office.kantor}` }
  })
})

const uiColumns = [
  { name: 'tgl', label: 'Tgl', field: 'tgl', align: 'left', sortable: true },
  { name: 'transid', label: 'Ref', field: 'transid', align: 'left', sortable: true },
  { name: 'perkiraan', label: 'Kode & Nama Akun', field: 'perkiraan', align: 'left', sortable: true },
  { name: 'keterangan', label: 'Keterangan', field: 'keterangan', align: 'left', sortable: true, style: 'max-width: 300px' },
  { name: 'debit', label: 'Debit', field: 'debit', align: 'right', sortable: true },
  { name: 'kredit', label: 'Kredit', field: 'kredit', align: 'right', sortable: true }
]

const exportColumns = [
  { label: 'Tanggal', field: 'tgl', format: val => date.formatDate(val, 'YYYY-MM-DD') },
  { label: 'Ref', field: 'transid' },
  { label: 'Kode Akun', field: 'perkiraan' },
  { label: 'Nama Akun', field: 'nama_perkiraan' },
  { label: 'Keterangan', field: 'keterangan' },
  { label: 'Debit', field: 'debit' },
  { label: 'Kredit', field: 'kredit' },
  { label: 'Kode Cabang', field: 'office' },
  { label: 'Cara Bayar', field: 'cbayar' },
  { label: 'Marketer', field: 'marketer' },
  { label: 'Kolektor', field: 'kolektor' },
  { label: 'User', field: 'user' }
]

const totalDebit = computed(() => rows.value.reduce((sum, item) => sum + Number(item.debit), 0))
const totalKredit = computed(() => rows.value.reduce((sum, item) => sum + Number(item.kredit), 0))

const isNewGroup = (index) => {
  if (index === 0) return true
  return rows.value[index].transid !== rows.value[index - 1].transid
}

const fetchData = async () => {
  loading.value = true
  try {
    const [resData, resOff] = await Promise.all([
      api.get('/reports/jurnal', { params: filters.value }),
      api.get('/master/office')
    ])
    rows.value = resData.data
    offices.value = resOff.data
  } catch (err) {
    $q.notify({ color: 'negative', message: 'Gagal mengambil data jurnal' })
  } finally {
    loading.value = false
  }
}

function wrapCsvValue (val, formatFn, row) {
  let formatted = formatFn !== void 0
    ? formatFn(val, row)
    : val

  formatted = formatted === void 0 || formatted === null
    ? ''
    : String(formatted)

  formatted = formatted.split('"').join('""')
  return `"${formatted}"`
}

const exportTable = () => {
  const content = [exportColumns.map(col => wrapCsvValue(col.label))].concat(
    rows.value.map(row => exportColumns.map(col => wrapCsvValue(
      typeof col.field === 'function'
        ? col.field(row)
        : row[col.field],
      col.format,
      row
    )).join(','))
  ).join('\r\n')

  const status = exportFile(
    'laporan-jurnal.csv',
    content,
    'text/csv'
  )

  if (status !== true) {
    $q.notify({ message: 'Browser denied file download...', color: 'negative', icon: 'warning' })
  }
}

watch(filters, fetchData, { deep: true })

const formatCurrency = (val) => {
  if (!val || val == 0) return '-'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(val)
}

onMounted(fetchData)
</script>

<style lang="scss">
.sticky-header-table {
  max-height: 70vh;
  .q-table__top,
  .q-table__bottom,
  thead tr:first-child th {
    background-color: white;
  }
  thead tr th {
    position: sticky;
    z-index: 1;
  }
  thead tr:first-child th {
    top: 0;
  }
}
</style>
