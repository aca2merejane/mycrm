<template>
  <q-page padding class="bg-grey-1">
    <div class="row q-col-gutter-md justify-center">
      <!-- Header Section -->
      <div class="col-12 col-md-11 row justify-between items-center q-col-gutter-y-md q-mb-md">
        <div class="col-12 col-sm-8">
          <h1 class="text-h5 q-my-none text-weight-bold text-primary">Laporan Qurban</h1>
          <div class="text-caption text-grey-7">Tinjau dokumentasi pelaksanaan qurban dan kelola status.</div>
        </div>
        <div class="col-12 col-sm-4 flex mobile-justify-start q-gutter-xs">
          <q-btn
            color="positive"
            icon="file_download"
            label="Ekspor CSV"
            @click="exportReport"
            :disable="rows.length === 0"
            unelevated
            class="rounded-borders"
          />
          <q-btn
            flat
            color="primary"
            icon="refresh"
            label="Muat Ulang"
            @click="fetchData"
            :loading="loading"
            class="rounded-borders"
          />
        </div>
      </div>

      <!-- Filters Panel -->
      <div class="col-12 col-md-11">
        <q-card flat bordered class="bg-white q-pa-md rounded-lg shadow-sm">
          <div class="row q-col-gutter-md items-center">
            <div class="col-12" :class="isCentralAdmin ? 'col-sm-3' : 'col-sm-4'">
              <q-input v-model="filters.startDate" label="Mulai Tanggal" type="date" outlined dense stack-label />
            </div>
            <div class="col-12" :class="isCentralAdmin ? 'col-sm-3' : 'col-sm-4'">
              <q-input v-model="filters.endDate" label="Sampai Tanggal" type="date" outlined dense stack-label />
            </div>
            <div class="col-12 col-sm-3" v-if="isCentralAdmin">
              <q-select
                v-model="filters.office"
                :options="officeOptions"
                option-label="kantor"
                option-value="officeid"
                emit-value
                map-options
                label="Filter Kantor"
                outlined
                dense
                clearable
              />
            </div>
            <div class="col-12" :class="isCentralAdmin ? 'col-sm-3' : 'col-sm-4'">
              <q-select
                v-model="filters.status"
                :options="statusOptions"
                label="Filter Status"
                outlined
                dense
                clearable
              />
            </div>
            <div class="col-12">
              <q-input v-model="filters.search" label="Cari donatur, produk, atau ID transaksi..." outlined dense clearable>
                <template v-slot:prepend>
                  <q-icon name="search" color="primary" />
                </template>
              </q-input>
            </div>
          </div>
        </q-card>
      </div>

      <!-- Tab Menu for Jenis Rekapitulasi -->
      <div class="col-12 col-md-11">
        <q-card flat bordered class="bg-white rounded-lg shadow-sm overflow-hidden">
          <q-tabs
            v-model="filters.groupBy"
            dense
            class="text-grey-7 bg-white"
            active-color="primary"
            indicator-color="primary"
            align="left"
            narrow-indicator
            outside-arrows
            mobile-arrows
          >
            <q-tab
              v-for="opt in groupByOptions"
              :key="opt.value"
              :name="opt.value"
              :label="opt.label"
              no-caps
              class="text-weight-bold q-py-sm"
            />
          </q-tabs>
        </q-card>
      </div>

      <!-- Summary Card -->
      <div class="col-12 col-md-11" v-if="rows.length > 0">
        <q-card flat bordered class="bg-indigo-1 text-indigo-9 q-pa-md rounded-lg shadow-sm">
          <div class="row items-center justify-between q-col-gutter-y-sm">
            <div class="col-12 col-sm-auto flex items-center q-gutter-sm">
              <q-icon name="payments" size="md" color="indigo" />
              <div>
                <div class="text-caption text-indigo-7 uppercase text-weight-bold">Total Nominal Qurban</div>
                <div class="text-h5 text-weight-bolder">{{ formatCurrency(totalSum) }}</div>
              </div>
            </div>
            <div class="col-12 col-sm-auto mobile-text-left">
              <div class="text-caption text-indigo-7 uppercase text-weight-bold">Jumlah Record</div>
              <div class="text-h6 text-weight-bolder">{{ rows.length }} Item</div>
            </div>
          </div>
        </q-card>
      </div>

      <!-- Report Table & Mobile Grid -->
      <div class="col-12 col-md-11">
        <q-table
          :rows="rows"
          :columns="currentColumns"
          :row-key="getRowKey"
          :loading="loading"
          flat
          bordered
          class="bg-white rounded-lg shadow-1"
          :pagination="pagination"
          :grid="$q.screen.lt.md"
        >
          <!-- Grid / Card View for Mobile -->
          <template v-slot:item="props">
            <div class="col-12 col-sm-6 q-pa-sm flex">
              <!-- Card layout for 'detail' mode (Mobile Friendly) -->
              <q-card v-if="filters.groupBy === 'detail'" flat bordered class="bg-white rounded-lg shadow-sm full-width column justify-between hover-card">
                <q-card-section class="q-pb-none">
                  <div class="row justify-between items-center q-mb-xs">
                    <div class="row items-center q-gutter-xs">
                      <q-chip
                        :color="getStatusColor(props.row.status)"
                        text-color="white"
                        dense
                        size="xs"
                        class="text-weight-bold q-ma-none"
                      >
                        {{ props.row.status }}
                      </q-chip>
                      <span class="text-weight-bold text-primary">{{ props.row.detail_id }}</span>
                    </div>
                    <div class="text-grey-6 text-caption">{{ formatDateOnly(props.row.tgl) }}</div>
                  </div>

                  <div class="text-subtitle1 text-weight-bold text-dark q-mt-xs">
                    {{ props.row.donatur }}
                  </div>
                  <div class="text-caption text-grey-7 flex items-center q-mb-sm">
                    <q-icon name="phone" size="14px" class="q-mr-xs" />
                    {{ props.row.hpdonatur || '-' }}
                  </div>

                  <q-separator class="q-my-sm" />

                  <div class="row justify-between items-start q-col-gutter-sm">
                    <div class="col-7">
                      <div class="text-caption text-grey-6">Program Qurban</div>
                      <div class="text-subtitle2 text-weight-medium text-dark">{{ props.row.sproduk }}</div>
                    </div>
                    <div class="col-5 text-right">
                      <div class="text-caption text-grey-6">Subtotal</div>
                      <div class="text-caption text-grey-8">
                        {{ props.row.qty }} x {{ formatCurrency(Number(props.row.price) || 0) }}
                      </div>
                      <div class="text-subtitle2 text-weight-bold text-primary">
                        {{ formatCurrency(Number(props.row.sub_total) || 0) }}
                      </div>
                    </div>
                  </div>

                  <div v-if="props.row.keterangan" class="bg-grey-2 q-pa-sm rounded-borders q-mt-sm text-caption text-grey-8 italic">
                    <strong>Ket:</strong> "{{ props.row.keterangan }}"
                  </div>
                  <div v-if="props.row.alasan" class="bg-red-1 text-negative q-pa-sm rounded-borders q-mt-sm text-caption italic">
                    <strong>Alasan Batal:</strong> "{{ props.row.alasan }}"
                  </div>
                </q-card-section>

                <q-card-section class="q-pt-sm q-pb-md">
                  <div class="text-caption text-grey-6 q-mb-xs text-weight-medium">Dokumentasi</div>
                  <div class="row q-gutter-sm" v-if="props.row.url_foto1 || props.row.url_foto2 || props.row.url_foto3">
                    <template v-for="i in [1, 2, 3]" :key="i">
                      <div
                        v-if="props.row['url_foto' + i]"
                        class="bg-grey-2 rounded-borders overflow-hidden img-container shadow-sm cursor-pointer"
                        style="width: 80px; height: 80px;"
                        @click="zoomPhoto(props.row['url_foto' + i])"
                      >
                        <q-img
                          :src="props.row['url_foto' + i]"
                          class="full-height full-width img-hover"
                          fit="cover"
                        />
                      </div>
                    </template>
                  </div>
                  <!-- Placeholder if no photos -->
                  <div v-else class="flex flex-center bg-grey-1 rounded-borders q-pa-sm border-dashed-grey text-center" style="height: 80px;">
                    <div class="row items-center justify-center q-gutter-xs text-grey-5">
                      <q-icon name="photo_camera" size="20px" />
                      <span class="text-caption text-weight-medium">Belum ada dokumentasi foto</span>
                    </div>
                  </div>
                </q-card-section>

                <q-card-actions align="right" class="bg-grey-1 q-px-md q-py-sm border-top-grey self-end full-width">
                  <template v-if="props.row.status.toUpperCase() === 'PAID'">
                    <div class="row q-col-gutter-xs full-width">
                      <div class="col-6">
                        <q-btn
                          flat
                          color="positive"
                          label="Selesaikan"
                          icon="check_circle"
                          size="sm"
                          class="full-width text-weight-bold text-subtitle2"
                          no-caps
                          @click="confirmFinish(props.row)"
                        />
                      </div>
                      <div class="col-6">
                        <q-btn
                          flat
                          color="negative"
                          label="Tolak/Batal"
                          icon="cancel"
                          size="sm"
                          class="full-width text-weight-bold text-subtitle2"
                          no-caps
                          @click="confirmReject(props.row)"
                        />
                      </div>
                    </div>
                  </template>
                  <div v-else-if="props.row.status.toUpperCase() === 'FINISH'" class="text-positive flex items-center justify-center q-gutter-xs full-width q-py-xs">
                    <q-icon name="check_circle" size="18px" />
                    <span class="text-subtitle2 text-weight-bold">Selesai</span>
                  </div>
                  <div v-else-if="props.row.status.toUpperCase() === 'BATAL'" class="text-negative flex items-center justify-center q-gutter-xs full-width q-py-xs">
                    <q-icon name="cancel" size="18px" />
                    <span class="text-subtitle2 text-weight-bold">Batal</span>
                  </div>
                  <div v-else class="text-grey-7 flex items-center justify-center q-gutter-xs full-width q-py-xs">
                    <q-icon name="hourglass_empty" size="18px" />
                    <span class="text-subtitle2 text-weight-bold">Menunggu Upload Foto</span>
                  </div>
                </q-card-actions>
              </q-card>

              <!-- Card layout for other rekap modes (Mobile Friendly) -->
              <q-card v-else flat bordered class="bg-white rounded-lg shadow-sm full-width column justify-between hover-card q-pa-sm">
                <q-card-section class="full-width">
                  <div class="row justify-between items-start q-col-gutter-sm">
                    <div class="col-8">
                      <div class="text-caption text-grey-6">{{ currentColumns[0] ? currentColumns[0].label : 'Kategori' }}</div>
                      <div class="text-subtitle2 text-weight-bold text-dark truncate-2-lines">
                        <template v-if="filters.groupBy === 'date'">
                          {{ formatDateOnly(props.row.tgl) }}
                        </template>
                        <template v-else>
                          {{ props.row[currentColumns[0]?.field || currentColumns[0]?.name] }}
                        </template>
                      </div>
                      
                      <!-- Additional detail for donor -->
                      <div v-if="filters.groupBy === 'donor'" class="text-caption text-grey-7 flex items-center q-mt-xs">
                        <q-icon name="phone" size="14px" class="q-mr-xs" />
                        {{ props.row.hpdonatur || '-' }}
                      </div>
                    </div>
                    
                    <div class="col-4 text-right">
                      <div class="text-caption text-grey-6">Nominal</div>
                      <div class="text-subtitle2 text-weight-bold text-primary">
                        {{ formatCurrency(Number(props.row.total_nominal) || 0) }}
                      </div>
                    </div>
                  </div>
                  
                  <q-separator class="q-my-sm" />
                  
                  <div class="row justify-between items-center text-caption text-grey-7">
                    <div>
                      Total Transaksi: <span class="text-weight-bold text-dark">{{ props.row.total_transaksi }}</span>
                    </div>
                    <div>
                      Total Qty: <span class="text-weight-bold text-dark">{{ props.row.total_qty }}</span>
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </template>

          <!-- Custom body cells for 'detail' mode (Desktop view) -->
          <template v-slot:body-cell-detail="props" v-if="filters.groupBy === 'detail'">
            <q-td :props="props">
              <div class="q-py-xs">
                <div class="row items-center q-gutter-xs">
                  <q-chip
                    :color="getStatusColor(props.row.status)"
                    text-color="white"
                    dense
                    size="xs"
                    class="text-weight-bold"
                  >
                    {{ props.row.status }}
                  </q-chip>
                  <span class="text-weight-bold text-primary">{{ props.row.detail_id }}</span>
                  <span class="text-grey-6 text-caption">({{ formatDateOnly(props.row.tgl) }})</span>
                </div>
                <div class="text-subtitle2 text-weight-bold q-mt-xs">
                  {{ props.row.donatur }} <span class="text-caption text-grey-7">({{ props.row.hpdonatur || '-' }})</span>
                </div>
                <div class="text-caption text-grey-8 q-mt-xs">
                  Program: <span class="text-weight-medium text-dark">{{ props.row.sproduk }}</span>
                </div>
                <div class="text-caption text-grey-7">
                  Jumlah: {{ props.row.qty }} x {{ formatCurrency(Number(props.row.price) || 0) }} = 
                  <span class="text-weight-bold text-primary">{{ formatCurrency(Number(props.row.sub_total) || 0) }}</span>
                </div>
                <div v-if="props.row.keterangan" class="text-caption text-grey-6 italic q-mt-xs">
                  Ket: "{{ props.row.keterangan }}"
                </div>
                <div v-if="props.row.alasan" class="text-caption text-negative italic q-mt-xs">
                  Alasan Batal: "{{ props.row.alasan }}"
                </div>
              </div>
            </q-td>
          </template>

          <template v-slot:body-cell-foto1="props" v-if="filters.groupBy === 'detail'">
            <q-td :props="props" align="center">
              <q-avatar
                v-if="props.row.url_foto1"
                square
                size="60px"
                class="cursor-pointer rounded-borders hover-scale shadow-1"
                @click="zoomPhoto(props.row.url_foto1)"
              >
                <img :src="props.row.url_foto1" />
              </q-avatar>
              <span v-else class="text-grey-4">-</span>
            </q-td>
          </template>

          <template v-slot:body-cell-foto2="props" v-if="filters.groupBy === 'detail'">
            <q-td :props="props" align="center">
              <q-avatar
                v-if="props.row.url_foto2"
                square
                size="60px"
                class="cursor-pointer rounded-borders hover-scale shadow-1"
                @click="zoomPhoto(props.row.url_foto2)"
              >
                <img :src="props.row.url_foto2" />
              </q-avatar>
              <span v-else class="text-grey-4">-</span>
            </q-td>
          </template>

          <template v-slot:body-cell-foto3="props" v-if="filters.groupBy === 'detail'">
            <q-td :props="props" align="center">
              <q-avatar
                v-if="props.row.url_foto3"
                square
                size="60px"
                class="cursor-pointer rounded-borders hover-scale shadow-1"
                @click="zoomPhoto(props.row.url_foto3)"
              >
                <img :src="props.row.url_foto3" />
              </q-avatar>
              <span v-else class="text-grey-4">-</span>
            </q-td>
          </template>

          <template v-slot:body-cell-actions="props" v-if="filters.groupBy === 'detail'">
            <q-td :props="props" align="center">
              <template v-if="props.row.status.toUpperCase() === 'PAID'">
                <div class="row q-col-gutter-xs justify-center no-wrap">
                  <q-btn
                    flat
                    color="positive"
                    label="Selesaikan"
                    icon="check_circle"
                    size="sm"
                    class="text-weight-bold text-caption"
                    no-caps
                    @click="confirmFinish(props.row)"
                  />
                  <q-btn
                    flat
                    color="negative"
                    label="Tolak/Batal"
                    icon="cancel"
                    size="sm"
                    class="text-weight-bold text-caption"
                    no-caps
                    @click="confirmReject(props.row)"
                  />
                </div>
              </template>
              <div v-else-if="props.row.status.toUpperCase() === 'FINISH'" class="text-positive flex items-center justify-center q-gutter-xs">
                <q-icon name="check_circle" size="20px" />
                <span class="text-caption text-weight-bold">Selesai</span>
              </div>
              <div v-else-if="props.row.status.toUpperCase() === 'BATAL'" class="text-negative flex items-center justify-center q-gutter-xs">
                <q-icon name="cancel" size="20px" />
                <span class="text-caption text-weight-bold">Batal</span>
              </div>
              <div v-else class="text-grey-7 flex items-center justify-center q-gutter-xs">
                <q-icon name="hourglass_empty" size="20px" />
                <span class="text-caption text-weight-bold">Menunggu Upload Foto</span>
              </div>
            </q-td>
          </template>
        </q-table>
      </div>
    </div>

    <!-- Photo Zoom Lightbox Dialog -->
    <q-dialog v-model="zoomDialog.show">
      <q-card style="max-width: 90vw; width: 600px; border-radius: 12px; overflow: hidden;">
        <q-img :src="zoomDialog.url" style="max-height: 80vh;" fit="contain" />
        <q-card-actions align="right" class="bg-dark text-white q-pa-sm">
          <q-btn flat label="Tutup" color="white" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Confirmation Dialog -->
    <q-dialog v-model="confirmDialog.show">
      <q-card style="border-radius: 12px; width: 400px; max-width: 95vw;">
        <q-card-section class="row items-center q-pb-none">
          <q-avatar icon="check_circle" color="primary" text-color="white" />
          <div class="text-h6 q-ml-md text-weight-bold">Konfirmasi Selesai</div>
        </q-card-section>

        <q-card-section class="q-pt-md">
          Apakah Anda yakin dokumentasi pelaksanaan Qurban untuk <strong>{{ confirmDialog.data?.donatur }}</strong> telah lengkap?
          <div class="q-mt-sm text-caption text-grey-7">
            Status akan diubah menjadi <strong>FINISH</strong>, dan notifikasi konfirmasi akan langsung dikirimkan ke pequrban melalui WhatsApp ke nomor <strong>{{ confirmDialog.data?.hpdonatur }}</strong>.
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Batal" color="grey-7" v-close-popup />
          <q-btn unelevated label="Selesaikan" color="primary" @click="processFinish" :loading="finishing" class="rounded-borders" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Reject Confirmation Dialog -->
    <q-dialog v-model="rejectDialog.show">
      <q-card style="border-radius: 12px; width: 400px; max-width: 95vw;">
        <q-card-section class="row items-center q-pb-none">
          <q-avatar icon="cancel" color="negative" text-color="white" />
          <div class="text-h6 q-ml-md text-weight-bold">Konfirmasi Tolak/Batal</div>
        </q-card-section>

        <q-card-section class="q-pt-md">
          Apakah Anda yakin ingin membatalkan transaksi Qurban untuk <strong>{{ rejectDialog.data?.donatur }}</strong>?
          <div class="q-mt-md">
            <q-input
              v-model="rejectDialog.alasan"
              label="Alasan Pembatalan"
              type="textarea"
              outlined
              dense
              rows="3"
              placeholder="Masukkan alasan penolakan/pembatalan di sini..."
              :rules="[val => !!val || 'Alasan pembatalan wajib diisi']"
            />
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Kembali" color="grey-7" v-close-popup />
          <q-btn unelevated label="Tolak/Batal" color="negative" @click="processReject" :loading="rejecting" class="rounded-borders" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { api } from 'src/api'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'src/stores/auth'

const $q = useQuasar()
const authStore = useAuthStore()

const loading = ref(false)
const finishing = ref(false)
const rows = ref([])
const officeOptions = ref([])

const pagination = ref({
  page: 1,
  rowsPerPage: 50
})

const filters = reactive({
  startDate: new Date(new Date().getFullYear() - 3, 0, 1).toISOString().split('T')[0], // Defaults to 3 years ago to retrieve existing data
  endDate: new Date().toISOString().split('T')[0],
  groupBy: 'detail',
  office: null,
  search: '',
  status: null
})

const zoomDialog = reactive({
  show: false,
  url: ''
})

const confirmDialog = reactive({
  show: false,
  data: null
})

const rejectDialog = reactive({
  show: false,
  data: null,
  alasan: ''
})

const rejecting = ref(false)

const isCentralAdmin = computed(() => {
  return authStore.user?.office === '0' || authStore.user?.office === 0
})

const groupByOptions = [
  { label: 'Detail Transaksi', value: 'detail' },
  { label: 'Rekap per Donatur', value: 'donor' },
  { label: 'Rekap per Produk Qurban', value: 'product' },
  { label: 'Rekap per Kantor Cabang', value: 'office' },
  { label: 'Rekap per Metode Bayar', value: 'payment_method' },
  { label: 'Rekap per Tanggal', value: 'date' },
  { label: 'Rekap per Bulan', value: 'month' },
  { label: 'Rekap per Tahun', value: 'year' }
]

const statusOptions = ['OPEN', 'PAID', 'FINISH', 'BATAL']

const sortNumber = (a, b) => (Number(a) || 0) - (Number(b) || 0)

// Define columns for each view
const columnsMap = {
  detail: [
    { name: 'detail', label: 'Detail Transaksi & Pequrban', align: 'left' },
    { name: 'foto1', label: 'Foto 1 (Dokumentasi)', align: 'center' },
    { name: 'foto2', label: 'Foto 2 (Dokumentasi)', align: 'center' },
    { name: 'foto3', label: 'Foto 3 (Dokumentasi)', align: 'center' },
    { name: 'actions', label: 'Aksi', align: 'center' }
  ],
  donor: [
    { name: 'donatur', label: 'Nama Donatur', field: 'donatur', align: 'left', sortable: true },
    { name: 'hpdonatur', label: 'No. HP', field: 'hpdonatur', align: 'left' },
    { name: 'total_transaksi', label: 'Total Transaksi', field: 'total_transaksi', align: 'center', sortable: true, sort: sortNumber },
    { name: 'total_qty', label: 'Total Qty', field: 'total_qty', align: 'center', sortable: true, sort: sortNumber },
    { name: 'total_nominal', label: 'Total Nominal', field: 'total_nominal', align: 'right', format: val => formatCurrency(Number(val) || 0), sortable: true, sort: sortNumber }
  ],
  product: [
    { name: 'nama_produk', label: 'Produk Qurban', field: 'nama_produk', align: 'left', sortable: true },
    { name: 'total_transaksi', label: 'Total Transaksi', field: 'total_transaksi', align: 'center', sortable: true, sort: sortNumber },
    { name: 'total_qty', label: 'Total Qty', field: 'total_qty', align: 'center', sortable: true, sort: sortNumber },
    { name: 'total_nominal', label: 'Total Nominal', field: 'total_nominal', align: 'right', format: val => formatCurrency(Number(val) || 0), sortable: true, sort: sortNumber }
  ],
  office: [
    { name: 'office', label: 'Kode Kantor', field: 'office', align: 'left', sortable: true },
    { name: 'total_transaksi', label: 'Total Transaksi', field: 'total_transaksi', align: 'center', sortable: true, sort: sortNumber },
    { name: 'total_qty', label: 'Total Qty', field: 'total_qty', align: 'center', sortable: true, sort: sortNumber },
    { name: 'total_nominal', label: 'Total Nominal', field: 'total_nominal', align: 'right', format: val => formatCurrency(Number(val) || 0), sortable: true, sort: sortNumber }
  ],
  payment_method: [
    { name: 'cara_bayar', label: 'ID Cara Bayar', field: 'cara_bayar', align: 'left', sortable: true },
    { name: 'total_transaksi', label: 'Total Transaksi', field: 'total_transaksi', align: 'center', sortable: true, sort: sortNumber },
    { name: 'total_qty', label: 'Total Qty', field: 'total_qty', align: 'center', sortable: true, sort: sortNumber },
    { name: 'total_nominal', label: 'Total Nominal', field: 'total_nominal', align: 'right', format: val => formatCurrency(Number(val) || 0), sortable: true, sort: sortNumber }
  ],
  date: [
    { name: 'tgl', label: 'Tanggal', field: 'tgl', align: 'left', format: val => val ? val.split('T')[0] : '-', sortable: true },
    { name: 'total_transaksi', label: 'Total Transaksi', field: 'total_transaksi', align: 'center', sortable: true, sort: sortNumber },
    { name: 'total_qty', label: 'Total Qty', field: 'total_qty', align: 'center', sortable: true, sort: sortNumber },
    { name: 'total_nominal', label: 'Total Nominal', field: 'total_nominal', align: 'right', format: val => formatCurrency(Number(val) || 0), sortable: true, sort: sortNumber }
  ],
  month: [
    { name: 'bulan', label: 'Bulan', field: 'bulan', align: 'left', sortable: true },
    { name: 'total_transaksi', label: 'Total Transaksi', field: 'total_transaksi', align: 'center', sortable: true, sort: sortNumber },
    { name: 'total_qty', label: 'Total Qty', field: 'total_qty', align: 'center', sortable: true, sort: sortNumber },
    { name: 'total_nominal', label: 'Total Nominal', field: 'total_nominal', align: 'right', format: val => formatCurrency(Number(val) || 0), sortable: true, sort: sortNumber }
  ],
  year: [
    { name: 'tahun', label: 'Tahun', field: 'tahun', align: 'left', sortable: true },
    { name: 'total_transaksi', label: 'Total Transaksi', field: 'total_transaksi', align: 'center', sortable: true, sort: sortNumber },
    { name: 'total_qty', label: 'Total Qty', field: 'total_qty', align: 'center', sortable: true, sort: sortNumber },
    { name: 'total_nominal', label: 'Total Nominal', field: 'total_nominal', align: 'right', format: val => formatCurrency(Number(val) || 0), sortable: true, sort: sortNumber }
  ]
}

const currentColumns = computed(() => {
  return columnsMap[filters.groupBy] || columnsMap.detail
})

const getRowKey = (row) => {
  if (filters.groupBy === 'detail') return row.detail_id
  if (filters.groupBy === 'donor') return `${row.donaturid || ''}_${row.donatur || ''}_${row.hpdonatur || ''}`
  if (filters.groupBy === 'product') return `${row.produk || ''}_${row.nama_produk || ''}`
  if (filters.groupBy === 'office') return row.office || 'default-office'
  if (filters.groupBy === 'payment_method') return row.cara_bayar || 'default-method'
  if (filters.groupBy === 'date') return row.tgl || 'default-date'
  if (filters.groupBy === 'month') return row.bulan || 'default-month'
  if (filters.groupBy === 'year') return row.tahun || 'default-year'
  return row.detail_id || 'default-id'
}

const totalSum = computed(() => {
  return rows.value.reduce((sum, r) => {
    const val = r.sub_total || r.total_nominal || 0
    return sum + Number(val)
  }, 0)
})

const formatCurrency = (val) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(val)
}

const formatDateOnly = (val) => {
  if (!val) return '-'
  return val.split('T')[0]
}

const getStatusColor = (status) => {
  if (!status) return 'grey-7'
  const s = status.toUpperCase()
  if (s === 'FINISH') return 'positive'
  if (s === 'PAID' || s === 'OPEN') return 'warning'
  if (s === 'BATAL') return 'negative'
  return 'primary'
}

const fetchData = async () => {
  loading.value = true
  try {
    const params = {
      startDate: filters.startDate,
      endDate: filters.endDate,
      groupBy: filters.groupBy,
      search: filters.search
    }
    if (filters.office) {
      params.office = filters.office
    }
    if (filters.status) {
      params.status = filters.status
    }
    const res = await api.get('/reports/qurban', { params })
    rows.value = Array.isArray(res.data) ? res.data : []
  } catch (err) {
    console.error('Failed to load qurban report:', err)
    $q.notify({ color: 'negative', message: 'Gagal mengambil data laporan' })
  } finally {
    loading.value = false
  }
}

const fetchOffices = async () => {
  if (!isCentralAdmin.value) return
  try {
    const res = await api.get('/master/office')
    officeOptions.value = Array.isArray(res.data) ? res.data : []
  } catch (err) {
    console.error('Failed to load offices:', err)
  }
}

const zoomPhoto = (url) => {
  zoomDialog.url = url
  zoomDialog.show = true
}

const confirmFinish = (row) => {
  confirmDialog.data = row
  confirmDialog.show = true
}

const processFinish = async () => {
  if (!confirmDialog.data) return
  finishing.value = true
  try {
    const detailId = confirmDialog.data.detail_id
    await api.put(`/reports/qurban/${detailId}/finish`)
    $q.notify({
      color: 'positive',
      message: 'Status Qurban diselesaikan dan notifikasi WA dikirim.'
    })
    confirmDialog.show = false
    fetchData()
  } catch (err) {
    console.error('Failed to finish qurban:', err)
    $q.notify({
      color: 'negative',
      message: err.response?.data?.message || 'Gagal menyelesaikan qurban'
    })
  } finally {
    finishing.value = false
  }
}

const confirmReject = (row) => {
  rejectDialog.data = row
  rejectDialog.alasan = ''
  rejectDialog.show = true
}

const processReject = async () => {
  if (!rejectDialog.data) return
  if (!rejectDialog.alasan.trim()) {
    $q.notify({
      color: 'negative',
      message: 'Alasan pembatalan harus diisi.'
    })
    return
  }
  rejecting.value = true
  try {
    const detailId = rejectDialog.data.detail_id
    await api.put(`/reports/qurban/${detailId}/reject`, {
      alasan: rejectDialog.alasan
    })
    $q.notify({
      color: 'positive',
      message: 'Status Qurban berhasil dibatalkan.'
    })
    rejectDialog.show = false
    fetchData()
  } catch (err) {
    console.error('Failed to reject qurban:', err)
    $q.notify({
      color: 'negative',
      message: err.response?.data?.message || 'Gagal membatalkan qurban'
    })
  } finally {
    rejecting.value = false
  }
}

const exportReport = () => {
  const cols = currentColumns.value
  const header = cols.map(c => c.label).join(',')
  const csvData = rows.value.map(row => {
    return cols.map(col => {
      let cell = ''
      if (col.name === 'detail' && filters.groupBy === 'detail') {
        cell = `${row.detail_id} | ${row.donatur} | ${row.sproduk} | Subtotal: ${row.sub_total}`
      } else if (typeof col.field === 'function') {
        cell = col.field(row)
      } else {
        cell = row[col.field || col.name] || ''
      }
      // Escape commas and quotes
      const cellStr = String(cell).replace(/"/g, '""')
      return `"${cellStr}"`
    }).join(',')
  })

  // Append total row
  csvData.push(`TOTAL NOMINAL,,,"${totalSum.value}"`)

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [header, ...csvData].join('\n')
  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', `Laporan_Qurban_${filters.groupBy}_${filters.startDate}_sd_${filters.endDate}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Watch filters to auto reload
watch(
  () => [filters.startDate, filters.endDate, filters.groupBy, filters.office, filters.status],
  (newVal, oldVal) => {
    // Clear rows and reset page if grouping changes to prevent rendering mismatched columns/rows
    if (oldVal && newVal[2] !== oldVal[2]) {
      rows.value = []
      pagination.value.page = 1
    }
    fetchData()
  }
)

// Watch search with a small delay (debounce)
let searchTimeout = null
watch(
  () => filters.search,
  () => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      fetchData()
    }, 500)
  }
)

onMounted(() => {
  fetchData()
  fetchOffices()
})
</script>

<style scoped>
.hover-scale {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hover-scale:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
}
.rounded-lg {
  border-radius: 12px;
}
.transition-all {
  transition: all 0.3s ease;
}
.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.border-top-grey {
  border-top: 1px solid #e0e0e0;
}
.hover-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hover-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0,0,0,0.08) !important;
}
.img-container {
  border: 1px dashed #cccccc;
  transition: border-color 0.2s ease;
}
.img-container:hover {
  border-color: var(--q-primary);
}
.img-hover {
  transition: transform 0.3s ease;
}
.img-hover:hover {
  transform: scale(1.15);
}
.truncate-2-lines {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;  
  overflow: hidden;
}
.border-dashed-grey {
  border: 1px dashed #cccccc;
  border-radius: 4px;
}

/* Media Query Utilities */
@media (max-width: 599px) {
  .mobile-justify-start {
    justify-content: flex-start !important;
  }
  .mobile-text-left {
    text-align: left !important;
  }
}
@media (min-width: 600px) {
  .mobile-justify-start {
    justify-content: flex-end !important;
  }
  .mobile-text-left {
    text-align: right !important;
  }
}
</style>
