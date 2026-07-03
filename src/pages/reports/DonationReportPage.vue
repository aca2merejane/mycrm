<template>
  <q-page padding class="bg-grey-1">
    <div class="row q-col-gutter-md justify-center">
      <div class="col-12 col-md-10 flex justify-between items-center q-mb-md">
        <div>
          <h2 class="text-h5 q-my-none text-weight-bold text-primary">Rekap Donasi</h2>
          <div class="text-caption text-grey-7">Laporan penerimaan donasi berdasarkan filter (Kantor, Produk, Jenis Dana)</div>
        </div>
        <q-btn flat color="primary" icon="download" label="Export Excel" />
      </div>

      <!-- Combined Filter Card -->
      <div class="col-12 col-md-10">
        <q-card flat bordered class="bg-white q-pa-md rounded-lg shadow-sm">
          <div class="row q-col-gutter-md items-center">
            <div class="col-12 col-sm-3">
              <q-input v-model="filters.startDate" label="Tanggal Mulai" type="date" filled dense />
            </div>
            <div class="col-12 col-sm-3">
              <q-input v-model="filters.endDate" label="Tanggal Selesai" type="date" filled dense />
            </div>
            <div class="col-12 col-sm-3">
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
            <div class="col-12 col-sm-3">
              <q-select
                v-model="filters.dana"
                :options="danaOptions"
                label="Jenis Dana"
                filled
                dense
                clearable
                @update:model-value="onDanaChange"
              />
            </div>
            <div class="col-12">
               <q-select
                v-model="filters.product"
                :options="products"
                option-label="produk"
                option-value="produk_id"
                emit-value
                map-options
                label="Pilih Produk / Program"
                filled
                dense
                use-input
                input-debounce="300"
                clearable
                @filter="filterProducts"
              >
                <template v-slot:no-option>
                  <q-item>
                    <q-item-section class="text-grey">
                      Tidak ada produk ditemukan
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>
            <div class="col-12 text-right">
              <q-btn color="primary" label="Tampilkan Laporan" @click="fetchData" :loading="loading" unelevated icon="search" class="q-px-lg" />
            </div>
          </div>
        </q-card>
      </div>

      <!-- Report Table -->
      <div class="col-12 col-md-10">
        <q-table
          :rows="rows"
          :columns="columns"
          row-key="produk_id"
          :loading="loading"
          flat
          bordered
          class="bg-white rounded-lg shadow-1"
          :pagination="{ rowsPerPage: 0 }"
          hide-pagination
        >
          <template v-slot:body-cell-total_qty="props">
            <q-td :props="props" class="text-right">
              {{ formatNumber(props.value) }}
            </q-td>
          </template>
          
          <template v-slot:body-cell-total_amount="props">
            <q-td :props="props" class="text-right text-weight-bold text-primary">
              {{ formatCurrency(props.value) }}
            </q-td>
          </template>

          <template v-slot:bottom-row v-if="rows.length > 0">
            <q-tr class="bg-grey-2 text-weight-bold">
              <q-td colspan="2" class="text-right uppercase">Total Seluruhnya</q-td>
              <q-td class="text-right">{{ formatNumber(totalTransactions) }}</q-td>
              <q-td class="text-right text-primary text-h6">{{ formatCurrency(totalDonations) }}</q-td>
            </q-tr>
          </template>
        </q-table>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { api } from 'src/api'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const loading = ref(false)
const rows = ref([])
const offices = ref([])
const allProducts = ref([])
const products = ref([])
const danaOptions = ref([])

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

const filters = ref({
  startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
  office: null,
  product: null,
  dana: null
})

const columns = [
  { name: 'dana', label: 'Jenis Dana', field: 'dana', align: 'left', sortable: true },
  { name: 'produk_name', label: 'Nama Produk', field: 'produk_name', align: 'left', sortable: true },
  { name: 'total_qty', label: 'Jumlah Transaksi', field: 'total_qty', align: 'right', sortable: true },
  { name: 'total_amount', label: 'Total Donasi', field: 'total_amount', align: 'right', sortable: true }
]

const totalTransactions = computed(() => rows.value.reduce((sum, item) => sum + Number(item.total_qty || 0), 0))
const totalDonations = computed(() => rows.value.reduce((sum, item) => sum + Number(item.total_amount || 0), 0))

const fetchData = async () => {
  loading.value = true
  try {
    const response = await api.get('/reports/rekap-donasi', { params: filters.value })
    rows.value = response.data
  } catch (err) {
    $q.notify({ color: 'negative', message: 'Gagal memuat rekap donasi' })
  } finally {
    loading.value = false
  }
}

const fetchMetadata = async () => {
  try {
    const [officeRes, prodRes] = await Promise.all([
      api.get('/master/office'),
      api.get('/master/product')
    ])
    offices.value = officeRes.data
    allProducts.value = prodRes.data
    products.value = prodRes.data
    
    // Extract unique dana options from products
    const uniqueDanaRaw = [...new Set(prodRes.data.map(p => p.dana).filter(d => d))]
    danaOptions.value = uniqueDanaRaw.sort()
  } catch (err) {
    console.error('Failed to load metadata', err)
  }
}

const filterProducts = (val, update) => {
  update(() => {
    const needle = val.toLowerCase()
    const baseList = filters.value.dana 
      ? allProducts.value.filter(p => p.dana === filters.value.dana)
      : allProducts.value
      
    products.value = baseList.filter(p => p.produk.toLowerCase().indexOf(needle) > -1)
  })
}

const onDanaChange = () => {
  filters.value.product = null
  if (filters.value.dana) {
    products.value = allProducts.value.filter(p => p.dana === filters.value.dana)
  } else {
    products.value = allProducts.value
  }
}

const formatNumber = (val) => {
  return new Intl.NumberFormat('id-ID').format(val || 0)
}

const formatCurrency = (val) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(val || 0)
}

onMounted(() => {
  fetchMetadata()
  fetchData()
})
</script>

<style scoped>
.uppercase { text-transform: uppercase; }
</style>
