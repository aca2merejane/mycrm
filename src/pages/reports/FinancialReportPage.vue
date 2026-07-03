<template>
  <q-page padding class="bg-grey-1">
    <div class="row q-col-gutter-md justify-center">
      <div class="col-12 col-md-8 flex justify-between items-center q-mb-md">
        <div>
          <h1 class="text-h5 q-my-none text-weight-bold text-primary">Laporan Laba Rugi</h1>
          <div class="text-caption text-grey-7">Ringkasan pendapatan dan pengeluaran operasional</div>
        </div>
        <q-btn flat color="primary" icon="print" label="Cetak Laporan" />
      </div>

      <!-- Collapsible Filters -->
      <div class="col-12 col-md-8">
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
              <div class="row q-col-gutter-sm items-center full-width">
                <div class="col-12 col-sm-3">
                  <q-input v-model="filters.startDate" label="Mulai" type="date" dense filled />
                </div>
                <div class="col-12 col-sm-3">
                  <q-input v-model="filters.endDate" label="Selesai" type="date" dense filled />
                </div>
                <div class="col-12 col-sm-3">
                  <q-select
                    v-model="filters.dana"
                    :options="['ZAKAT', 'INFAK', 'INFAK_KHUSUS','QURBAN', 'DSKL', 'WAKAF']"
                    label="Jenis Dana"
                    filled
                    dense
                    clearable
                  />
                </div>
                <div class="col-12 col-sm-3 text-right">
                  <q-btn color="primary" flat icon="refresh" @click="fetchData" :loading="loading" label="Update" />
                </div>
                <div class="col-12 q-mt-sm">
                  <q-select
                    v-model="filters.office"
                    :options="hierarchicalOffices"
                    option-label="kantor"
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
                            {{ scope.opt.kantor }}
                          </q-item-label>
                          <q-item-label caption :style="{ paddingLeft: (scope.opt.level * 16) + 'px' }">{{ scope.opt.officeid }}</q-item-label>
                        </q-item-section>
                      </q-item>
                    </template>
                  </q-select>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </q-expansion-item>
      </div>

      <!-- Financial Report Content -->
      <div class="col-12 col-md-8">
        <q-card flat bordered class="bg-white rounded-lg q-pa-lg">
          <div class="text-center q-mb-xl">
             <div class="text-h6 text-weight-bold uppercase">LAPORAN LABA RUGI</div>
             <div class="text-caption text-grey-8 uppercase">Unit: {{ selectedOfficeName }}</div>
             <div class="text-caption text-grey-8">{{ formatDateRange }}</div>
          </div>

          <!-- PENDAPATAN -->
          <div class="q-mb-md">
            <div class="row text-weight-bolder text-primary q-py-sm border-bottom">
              <div class="col">PENDAPATAN</div>
              <div class="col text-right">JUMLAH</div>
            </div>
            <q-list dense padding>
              <q-item v-for="item in reports.pendapatan" :key="item.coa">
                <q-item-section>{{ item.coa }} - {{ item.perkiraan }}</q-item-section>
                <q-item-section side>{{ formatCurrency(item.total_kredit - item.total_debit) }}</q-item-section>
              </q-item>
              <q-separator />
              <q-item class="text-weight-bold bg-teal-1">
                <q-item-section>TOTAL PENDAPATAN (A)</q-item-section>
                <q-item-section side class="text-primary">{{ formatCurrency(totalRevenue) }}</q-item-section>
              </q-item>
            </q-list>
          </div>

          <!-- PENGELUARAN -->
          <div class="q-mb-lg">
            <div class="row text-weight-bolder text-negative q-py-sm border-bottom q-mt-lg">
              <div class="col">PENGELUARAN & BEBAN</div>
              <div class="col text-right">JUMLAH</div>
            </div>
            <q-list dense padding>
              <q-item v-for="item in reports.pengeluaran" :key="item.coa">
                <q-item-section>{{ item.coa }} - {{ item.perkiraan }}</q-item-section>
                <q-item-section side>{{ formatCurrency(item.total_debit - item.total_kredit) }}</q-item-section>
              </q-item>
              <q-separator />
              <q-item class="text-weight-bold bg-red-1">
                <q-item-section>TOTAL PENGELUARAN (B)</q-item-section>
                <q-item-section side class="text-negative">{{ formatCurrency(totalExpense) }}</q-item-section>
              </q-item>
            </q-list>
          </div>

          <!-- SUMMARY -->
          <div class="q-pa-md rounded-borders" :class="profitColor">
            <div class="row text-h5 text-weight-bolder items-center">
              <div class="col">SURPLUS / (DEFISIT)</div>
              <div class="col text-right">{{ formatCurrency(netProfit) }}</div>
            </div>
            <div class="text-caption">Net Profit/Loss (A - B)</div>
          </div>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { api } from 'src/api'
import { date, useQuasar } from 'quasar'

const $q = useQuasar()
const loading = ref(false)
const reports = ref({ pendapatan: [], pengeluaran: [] })

const offices = ref([])

const hierarchicalOffices = computed(() => {
  const sorted = [...offices.value].sort((a, b) => a.officeid.localeCompare(b.officeid))
  return sorted.map(office => {
    const level = sorted.filter(parent => 
      office.officeid !== parent.officeid && 
      office.officeid.startsWith(parent.officeid)
    ).length
    return { ...office, level }
  })
})

const selectedOfficeName = computed(() => {
  if (!filters.value.office) return 'SELURUH UNIT (KONSOLIDASI)'
  const found = offices.value.find(o => o.officeid === filters.value.office)
  return found ? found.kantor : filters.value.office
})

const filterExpanded = ref($q.screen.gt.sm)
const filters = ref({
  startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
  office: null,
  dana: null
})

const totalRevenue = computed(() => reports.value.pendapatan.reduce((sum, item) => sum + (Number(item.total_kredit) - Number(item.total_debit)), 0))
const totalExpense = computed(() => reports.value.pengeluaran.reduce((sum, item) => sum + (Number(item.total_debit) - Number(item.total_kredit)), 0))
const netProfit = computed(() => totalRevenue.value - totalExpense.value)

const profitColor = computed(() => netProfit.value >= 0 ? 'bg-teal text-white' : 'bg-negative text-white')
const formatDateRange = computed(() => `PERIODE ${date.formatDate(filters.value.startDate, 'DD/MM/YYYY')} S/D ${date.formatDate(filters.value.endDate, 'DD/MM/YYYY')}`)

const fetchData = async () => {
  loading.value = true
  try {
    const [resData, resOff] = await Promise.all([
      api.get('/reports/keuangan', { params: filters.value }),
      api.get('/master/office')
    ])
    reports.value = resData.data
    offices.value = resOff.data
  } catch (err) {
    $q.notify({ color: 'negative', message: 'Gagal memuat laporan keuangan' })
  } finally {
    loading.value = false
  }
}

watch(filters, fetchData, { deep: true })

const formatCurrency = (val) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(val)
}

onMounted(fetchData)
</script>

<style scoped>
.border-bottom { border-bottom: 2px solid #eee; }
.uppercase { text-transform: uppercase; }
</style>
