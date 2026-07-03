<template>
  <q-page padding class="bg-grey-1">
    <div class="row q-col-gutter-md justify-center">
      <!-- Header Section -->
      <div class="col-12 col-md-10 flex justify-between items-center q-mb-md">
        <div>
          <h1 class="text-h5 q-my-none text-weight-bold text-primary">Riwayat Transaksi</h1>
          <div class="text-caption text-grey-7">Daftar penerimaan donasi seluruh kantor</div>
        </div>
        <q-btn
          color="primary"
          icon="add"
          label="Input Donasi"
          to="/transactions/new"
          unelevated
          class="rounded-borders"
        />
      </div>

      <!-- Search & Filter Card -->
      <div class="col-12 col-md-10">
        <q-card flat bordered class="bg-white q-pa-sm rounded-lg">
          <div class="row q-col-gutter-sm items-center">
            <div class="col-12 col-sm-6">
              <q-input v-model="filter" dense filled borderless placeholder="Cari donatur atau ID..." clearable>
                <template v-slot:prepend>
                  <q-icon name="search" color="primary" />
                </template>
              </q-input>
            </div>
            <div class="col-6 col-sm-3">
              <q-select
                v-model="statusFilter"
                :options="['Semua Status', 'Open', 'Success', 'Pending', 'Failed']"
                dense
                filled
                borderless
                label="Status"
              />
            </div>
            <div class="col-6 col-sm-3 text-right">
              <q-btn flat color="grey-7" icon="refresh" label="Muat Ulang" @click="fetchData" :loading="loading" />
            </div>
          </div>
        </q-card>
      </div>

      <!-- Transaction Cards List -->
      <div class="col-12 col-md-10">
        <div class="row q-col-gutter-md">
          <div v-for="row in rows" :key="row.id" class="col-12 col-sm-6 col-md-4">
            <q-card flat bordered class="transaction-card hover-shadow transition-all">
              <q-card-section class="q-pb-none">
                <div class="row items-center justify-between no-wrap">
                  <div class="text-overline text-grey-7">{{ row.id }}</div>
                  <q-badge :color="getStatusColor(row.status)" class="q-px-sm q-py-xs text-weight-bold">
                    {{ row.status }}
                  </q-badge>
                </div>
                <div class="text-h6 text-weight-bolder q-mt-xs ellipsis">{{ row.donor_name }}</div>
                <div class="text-caption text-grey-8 ellipsis q-mb-xs" v-if="row.donor_address">
                   <q-icon name="place" size="14px" class="q-mr-xs" color="grey-6" />
                   {{ row.donor_address }}
                </div>
                <div class="text-caption text-grey-6 flex items-center">
                  <q-icon name="event" size="14px" class="q-mr-xs" />
                  {{ date.formatDate(row.date, 'DD MMM YYYY') }}
                </div>
              </q-card-section>

              <q-card-section class="q-py-md">
                <div class="row items-center justify-between">
                  <div>
                    <div class="text-caption text-grey-7">Total Donasi</div>
                    <div class="text-h6 text-primary text-weight-bold">{{ formatCurrency(row.total) }}</div>
                  </div>
                  <div class="text-right">
                    <div class="text-caption text-grey-7">Metode</div>
                    <div class="text-subtitle2">{{ row.payment_method }}</div>
                  </div>
                </div>
              </q-card-section>

              <q-separator inset />

              <q-card-actions align="around" class="q-py-sm">
                <q-btn flat color="primary" icon="visibility" label="Detail" @click="viewDetail(row.id)" size="sm" class="full-width-xs" />
                <q-btn flat color="info" icon="print" label="Cetak" size="sm" class="full-width-xs" @click="printDirect(row.id)" />
              </q-card-actions>
            </q-card>
          </div>

          <!-- Empty State -->
          <div v-if="rows.length === 0 && !loading" class="col-12 text-center q-pa-xl">
            <q-icon name="receipt_long" size="84px" color="grey-4" />
            <div class="text-h6 text-grey-5 q-mt-md">Tidak ada transaksi ditemukan</div>
            <q-btn flat color="primary" label="Clear Filter" @click="clearFilters" />
          </div>
        </div>

        <!-- Pagination Section -->
        <div class="row justify-center q-mt-xl q-mb-lg">
          <q-pagination
            v-model="currentPage"
            :max="totalPages"
            :max-pages="5"
            boundary-numbers
            direction-links
            color="grey-7"
            active-color="primary"
            active-design="unelevated"
            flat
            @update:model-value="fetchData"
            v-if="totalPages > 1"
          />
        </div>
      </div>
    </div>

    <!-- Detail Dialog (Existing implementation) -->
    <q-dialog v-model="detailDialog" position="bottom" transition-show="slide-up" transition-hide="slide-down">
      <q-card style="width: 100%; max-width: 600px; border-radius: 20px 20px 0 0">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6 text-weight-bold">Detail Transaksi</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section v-if="selectedTransaction" class="q-pa-md">
          <div class="text-overline text-primary">{{ selectedTransaction.id }}</div>
          <div class="text-h5 text-weight-bold">{{ selectedTransaction.donor_name }}</div>
          <div class="text-body2 text-grey-7 q-mb-lg">{{ selectedTransaction.donor_hp || 'No Phone' }}</div>

          <div class="bg-grey-2 q-pa-md rounded-lg q-mb-md">
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <div class="text-caption text-grey-7">Status</div>
                <q-badge :color="getStatusColor(selectedTransaction.status)">{{ selectedTransaction.status }}</q-badge>
              </div>
              <div class="col-6 text-right">
                <div class="text-caption text-grey-7">Metode Bayar</div>
                <div class="text-weight-bold">{{ selectedTransaction.payment_method }}</div>
              </div>
            </div>
          </div>

          <q-list bordered separator class="rounded-borders overflow-hidden">
            <q-item v-for="item in selectedTransaction.items" :key="item.id" class="q-py-md">
              <q-item-section>
                <q-item-label class="text-weight-bold">{{ item.dana || '-' }} - {{ item.produk_name }}</q-item-label>
                <q-item-label caption>{{ item.qty }} x {{ formatCurrency(item.price) }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-item-label class="text-weight-bold text-dark">{{ formatCurrency(item.sub_total) }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>

          <!-- Keterangan & Lampiran -->
          <div v-if="selectedTransaction.keterangan" class="q-mt-md q-pa-sm bg-grey-2 rounded-borders">
            <div class="text-caption text-grey-7 text-weight-bold">Keterangan:</div>
            <div class="text-body2 text-grey-9">{{ selectedTransaction.keterangan }}</div>
          </div>

          <div v-if="selectedTransaction.bukti" class="q-mt-md">
            <div class="text-caption text-grey-7 text-weight-bold q-mb-xs">Bukti Transaksi / Lampiran:</div>
            <q-img
              :src="`/uploads/${selectedTransaction.bukti}`"
              spinner-color="primary"
              class="rounded-borders cursor-pointer hover-scale transition-all"
              style="max-height: 250px; width: 100%; border: 1px solid #e0e0e0; border-radius: 8px;"
              fit="contain"
              @click="openImage(`/uploads/${selectedTransaction.bukti}`)"
            >
              <template v-slot:error>
                <div class="absolute-full flex flex-center bg-grey-2 text-grey-7 text-caption">
                  <q-icon name="broken_image" size="24px" class="q-mr-xs" />
                  Gagal memuat gambar bukti
                </div>
              </template>
            </q-img>
          </div>

          <div class="row justify-between items-center q-mt-lg">
            <div class="text-h6 text-weight-bold">Grand Total</div>
            <div class="text-h5 text-primary text-weight-bolder">{{ formatCurrency(selectedTransaction.total) }}</div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Tutup" color="grey-7" v-close-popup size="lg" />
          <q-btn 
            color="primary" 
            label="Cetak Kwitansi" 
            icon="print" 
            unelevated 
            size="lg" 
            class="rounded-borders" 
            @click="printReceipt(selectedTransaction)"
          />
          <q-btn 
            v-if="isFinance && selectedTransaction.status?.toLowerCase() === 'open'"
            color="positive" 
            label="Approve Keuangan" 
            icon="verified" 
            unelevated 
            size="lg" 
            class="rounded-borders q-ml-sm"
            @click="approveTransaction(selectedTransaction.id)"
            :loading="approving"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { api } from 'src/api'
import { date, useQuasar } from 'quasar'
import { useAuthStore } from 'src/stores/auth'

const auth = useAuthStore()
const $q = useQuasar()
const loading = ref(false)
const approving = ref(false)
const filter = ref('')
const statusFilter = ref('Semua Status')
const rows = ref([])

// Pagination State
const currentPage = ref(1)
const totalPages = ref(1)
const pageSize = ref(12) // Show 12 items per page (3 cols x 4 rows)
const totalCount = ref(0)

// Detail Dialog State
const detailDialog = ref(false)
const selectedTransaction = ref(null)

const fetchData = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      search: filter.value,
      status: statusFilter.value
    }
    const response = await api.get('/transactions', { params })
    rows.value = response.data.data
    totalPages.value = response.data.pagination.totalPages
    totalCount.value = response.data.pagination.totalCount
  } catch (error) {
    console.error('Failed to fetch transactions:', error)
    $q.notify({ color: 'negative', message: 'Gagal mengambil data transaksi' })
  } finally {
    loading.value = false
  }
}

// Reset page when filter changes
watch([filter, statusFilter], () => {
  currentPage.value = 1
  fetchData()
})

const clearFilters = () => {
  filter.value = ''
  statusFilter.value = 'Semua Status'
}

const viewDetail = async (id) => {
  $q.loading.show()
  try {
    const response = await api.get(`/transactions/${id}`)
    selectedTransaction.value = response.data
    detailDialog.value = true
  } catch (error) {
    $q.notify({ color: 'negative', message: 'Gagal mengambil detail transaksi' })
  } finally {
    $q.loading.hide()
  }
}

const openImage = (url) => {
  window.open(url, '_blank')
}

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'success': return 'positive'
    case 'open': return 'warning'
    case 'pending': return 'info'
    case 'failed': return 'negative'
    default: return 'grey'
  }
}

const formatCurrency = (val) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(val)
}

const isFinance = computed(() => {
  // Check if user is admin or has group_id 2 (Keuangan)
  const roleId = Number(auth.user?.role)
  return auth.isAdmin || roleId === 2
})

const approveTransaction = async (id) => {
  $q.dialog({
    title: 'Konfirmasi Verifikasi',
    message: 'Apakah Anda yakin ingin memverifikasi transaksi ini? Proses ini akan melakukan pencatatan jurnal otomatis.',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    approving.value = true
    try {
      await api.post(`/transactions/${id}/approve`)
      $q.notify({ color: 'positive', message: 'Transaksi berhasil diverifikasi dan dijurnal' })
      detailDialog.value = false
      fetchData()
    } catch (error) {
      $q.notify({ color: 'negative', message: error.response?.data?.message || 'Gagal memverifikasi transaksi' })
    } finally {
      approving.value = false
    }
  })
}

// Utility Terbilang (Indonesia)
const terbilang = (n) => {
  if (n < 0) return 'Minus ' + terbilang(-n)
  if (n === 0) return ''
  const unit = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas']
  let res = ''
  if (n < 12) res = unit[n]
  else if (n < 20) res = terbilang(n - 10) + ' Belas'
  else if (n < 100) res = terbilang(Math.floor(n / 10)) + ' Puluh ' + terbilang(n % 10)
  else if (n < 200) res = 'Seratus ' + terbilang(n - 100)
  else if (n < 1000) res = terbilang(Math.floor(n / 100)) + ' Ratus ' + terbilang(n % 100)
  else if (n < 2000) res = 'Seribu ' + terbilang(n - 1000)
  else if (n < 1000000) res = terbilang(Math.floor(n / 1000)) + ' Ribu ' + terbilang(n % 1000)
  else if (n < 1000000000) res = terbilang(Math.floor(n / 1000000)) + ' Juta ' + terbilang(n % 1000000)
  return res.trim()
}

const printDirect = async (id) => {
  $q.loading.show({ message: 'Menyiapkan kwitansi...' })
  try {
    const response = await api.get(`/transactions/${id}`)
    printReceipt(response.data)
  } catch (error) {
    console.error('Print direct failed:', error)
    $q.notify({ color: 'negative', message: 'Gagal menyiapkan data cetak' })
  } finally {
    $q.loading.hide()
  }
}

const printReceipt = (trx) => {
  const printWindow = window.open('', '_blank')
  const logoUrl = '/logo_lembaga.png'
  
  const itemsHtml = trx.items.map(item => `
    <tr>
      <td style="border-bottom: 1px solid #eee; font-size: 8pt; padding: 2px 0;">${item.dana || '-'} - ${item.produk_name}</td>
      <td style="border-bottom: 1px solid #eee; font-size: 8pt; padding: 2px 0; text-align: right;">${formatCurrency(item.sub_total)}</td>
    </tr>
  `).join('')

  printWindow.document.write(`
    <html>
      <head>
        <title>Kwitansi ${trx.id}</title>
        <style>
          @page { size: A5; margin: 8mm; }
          body { font-family: 'Inter', 'Segoe UI', sans-serif; font-size: 10pt; color: #2c3e50; line-height: 1.2; margin:0; padding:0; }
          .container { width: 100%; position: relative; }
          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0D47A1; padding-bottom: 8px; margin-bottom: 10px; }
          .logo { height: 45px; object-fit: contain; }
          .institution-info { text-align: right; font-size: 8pt; line-height: 1.1; color: #555; }
          .receipt-title { text-align: center; font-size: 13pt; font-weight: bold; margin: 8px 0; letter-spacing: 1px; color: #0D47A1; text-transform: uppercase; }
          
          .meta-row { display: flex; justify-content: space-between; margin-bottom: 10px; padding: 6px 10px; background: #f1f4f9; border-radius: 4px; font-size: 9pt; }
          .donor-box { margin-bottom: 12px; padding: 0 5px; }
          .field { display: flex; margin-bottom: 3px; }
          .label { width: 100px; font-weight: bold; color: #1565C0; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          th { text-align: left; border-bottom: 1px solid #333; padding-bottom: 4px; font-size: 9pt; color: #1565C0; }
          
          .total-section { border-top: 2px solid #0D47A1; padding-top: 7px; }
          .total-box { background: #E3F2FD; padding: 6px 10px; font-weight: bold; display: flex; justify-content: space-between; font-size: 11pt; color: #0D47A1; border-radius: 4px; }
          .terbilang-box { font-style: italic; font-size: 8.5pt; margin-top: 4px; color: #444; padding: 0 5px; border-left: 3px solid #0D47A1; }
          
          .footer { display: flex; justify-content: space-between; margin-top: 25px; align-items: end; }
          .info-small { font-size: 8pt; color: #666; }
          .signature-box { text-align: center; width: 160px; font-size: 9pt; }
          .signature-space { height: 45px; }
          
          .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 60pt; color: rgba(0,0,0,0.03); font-weight: bold; pointer-events: none; white-space: nowrap; }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        <div class="container">
          <div class="watermark">BMH APPS</div>
          
          <div class="header">
            <img src="${logoUrl}" class="logo">
            <div class="institution-info">
              <strong style="color: #0D47A1; font-size: 10pt;">BAITUL MAAL HIDAYATULLAH</strong><br>
              Lembaga Amil Zakat Nasional<br>
              Jl. Kalimanggis Raya No. 01, Bekasi<br>
              www.bmh.or.id | Info: (021) 8431 1133
            </div>
          </div>

          <div class="receipt-title">Bukti Penerimaan Donasi</div>

          <div class="meta-row">
            <span>No: <strong>${trx.id}</strong></span>
            <span>Tanggal: <strong>${date.formatDate(trx.date, 'DD/MM/YYYY')}</strong></span>
          </div>

          <div class="donor-box">
            <div class="field"><span class="label">Nama Donatur</span> <span>: ${trx.donor_name}</span></div>
            <div class="field"><span class="label">No. HP / WA</span> <span>: ${trx.donor_hp || '-'}</span></div>
            <div class="field"><span class="label">Alamat</span> <span>: ${trx.donor_address || '-'}</span></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Keterangan Program</th>
                <th style="text-align: right;">Jumlah (IDR)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-box">
              <span>TOTAL DONASI</span>
              <span>${formatCurrency(trx.total)}</span>
            </div>
            <div class="terbilang-box">
              Terbilang: <strong># ${terbilang(trx.total)} Rupiah #</strong>
            </div>
          </div>

          <div class="footer">
            <div class="info-small">
              Metode: <strong>${trx.payment_method}</strong><br>
              Petugas: <strong>${trx.user || 'Admin'}</strong><br>
              <div style="margin-top: 5px; font-size: 7pt; font-style: italic;">
                * Donasi Anda telah tercatat secara resmi di sistem kami.
              </div>
            </div>
            <div class="signature-box">
              <div>Bekasi, ${date.formatDate(new Date(), 'DD MMM YYYY')}</div>
              <div style="margin-top: 3px; font-weight: bold;">Kasir / Amil</div>
              <div class="signature-space"></div>
              <div style="border-bottom: 1px solid #333; display: inline-block; min-width: 120px; font-weight: bold;">
                ${trx.user || 'Official BMH'}
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `)
  printWindow.document.close()
}



onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.transaction-card {
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  background: white;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.05);
  }
}

.rounded-lg {
  border-radius: 12px;
}

.transition-all {
  transition: all 0.3s ease;
}

.hover-scale {
  transition: transform 0.2s ease-in-out;
  &:hover {
    transform: scale(1.02);
  }
}

@media (max-width: 599px) {
  .full-width-xs {
    width: 45%;
  }
}
</style>
