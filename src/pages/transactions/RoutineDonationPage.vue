<template>
  <q-page padding class="bg-grey-1">
    <div class="row q-col-gutter-md">
      <!-- Header -->
      <div class="col-12 flex justify-between items-center q-mb-md">
        <div>
          <h1 class="text-h5 q-my-none text-weight-bold text-primary">Manajemen Donatur Rutin</h1>
          <div class="text-caption text-grey-7">Kelola komitmen donasi bulanan dan penagihan otomatis</div>
        </div>
        <div class="q-gutter-sm">
          <q-btn
            v-if="isAdmin"
            color="orange"
            icon="event_repeat"
            label="Generate Tahunan"
            @click="promptYearlyGenerate"
            unelevated
            class="rounded-borders"
          />
          <q-btn
            color="primary"
            icon="add"
            label="Tambah Donatur Rutin"
            @click="openSelectionDialog"
            unelevated
            class="rounded-borders"
          />
        </div>
      </div>

      <div class="col-12">
        <q-tabs v-model="tab" dense class="text-primary" active-color="primary" indicator-color="primary" align="left" narrow-indicator>
          <q-tab name="donors" icon="people" label="Daftar Donatur Rutin" />
          <q-tab name="pending" icon="schedule" label="Tagihan Pending" />
        </q-tabs>
        <q-separator />

        <q-tab-panels v-model="tab" animated class="bg-transparent">
          <!-- Tab: Routine Donors -->
          <q-tab-panel name="donors" class="q-pa-none q-pt-md">
            <q-table
              :rows="routineDonors"
              :columns="donorColumns"
              row-key="donatur_id"
              :loading="loadingDonors"
              :filter="searchDonor"
              flat
              bordered
              :grid="$q.screen.lt.md"
              class="bg-white rounded-borders"
            >
              <!-- Search Header -->
              <template v-slot:top-right>
                <q-input v-model="searchDonor" dense filled borderless placeholder="Cari Donatur..." style="min-width: 250px" clearable>
                  <template v-slot:prepend>
                    <q-icon name="search" color="primary" />
                  </template>
                </q-input>
              </template>
              <!-- MOBILE VIEW (Grid Slot) -->
              <template v-slot:item="props">
                <div class="q-pa-xs col-12">
                  <q-card flat bordered class="q-mb-sm rounded-borders shadow-1">
                    <q-item>
                      <q-item-section avatar>
                        <q-avatar color="teal-1" text-color="primary" icon="person" />
                      </q-item-section>

                      <q-item-section>
                        <q-item-label class="text-weight-bold text-subtitle1">{{ props.row.nama }}</q-item-label>
                        <q-item-label caption class="flex items-center">
                          <q-icon name="phone" size="14px" class="q-mr-xs" />
                          {{ props.row.no_hp || '-' }}
                        </q-item-label>
                        <q-item-label caption class="q-mt-xs flex items-center q-gutter-x-sm">
                          <q-badge outline color="primary">{{ getPaymentMethodName(props.row.c_bayar) }}</q-badge>
                          <q-badge :color="props.row.status === 'ACTIVE' ? 'positive' : 'grey-7'">
                            {{ props.row.status }}
                          </q-badge>
                        </q-item-label>
                      </q-item-section>

                      <q-item-section side>
                        <q-btn flat round color="primary" icon="edit_note" @click.stop="editCommitment(props.row)">
                          <q-tooltip>Edit Komitmen Produk</q-tooltip>
                        </q-btn>
                      </q-item-section>
                    </q-item>
                  </q-card>
                </div>
              </template>

              <template v-slot:body-cell-actions="props">
                <q-td :props="props" class="q-gutter-xs" align="center">
                  <q-btn flat round color="primary" icon="edit_note" size="sm" @click="editCommitment(props.row)">
                    <q-tooltip>Edit Komitmen Produk</q-tooltip>
                  </q-btn>
                </q-td>
              </template>
              <template v-slot:body-cell-status="props">
                <q-td :props="props" align="center">
                  <q-badge :color="props.value === 'ACTIVE' ? 'positive' : 'grey-7'">
                    {{ props.value }}
                  </q-badge>
                </q-td>
              </template>
            </q-table>
          </q-tab-panel>

          <!-- Tab: Pending Billing (Transactions with Status PENDING) -->
          <q-tab-panel name="pending" class="q-pa-none q-pt-md">
            <q-table
              :rows="pendingTx"
              :columns="txColumns"
              row-key="trans_id"
              :loading="loadingPending"
              :filter="searchPending"
              flat
              bordered
              :grid="$q.screen.lt.md"
              class="bg-white rounded-borders"
            >
              <!-- Search Header -->
              <template v-slot:top-right>
                <q-input v-model="searchPending" dense filled borderless placeholder="Cari Tagihan..." style="min-width: 250px" clearable>
                  <template v-slot:prepend>
                    <q-icon name="search" color="primary" />
                  </template>
                </q-input>
              </template>
              <!-- MOBILE VIEW (Grid Slot) -->
              <template v-slot:item="props">
                <div class="q-pa-xs col-12">
                  <q-card flat bordered class="q-mb-sm rounded-borders shadow-1">
                    <q-item>
                      <q-item-section avatar>
                        <q-avatar color="orange-1" text-color="orange" icon="receipt_long" />
                      </q-item-section>

                      <q-item-section>
                        <q-item-label class="text-weight-bold text-subtitle1">{{ props.row.donor_name || props.row.donatur || 'Unknown' }}</q-item-label>
                        <q-item-label caption class="text-caption">{{ props.row.trans_id }}</q-item-label>
                        <q-item-label caption class="flex items-center q-mt-xs">
                          <q-icon name="event" size="14px" class="q-mr-xs" />
                          Tgl: {{ props.row.tgl ? props.row.tgl.split('T')[0] : '-' }}
                        </q-item-label>
                        <q-item-label class="text-subtitle1 text-primary text-weight-bold q-mt-xs">
                          {{ formatCurrency(props.row.total_donasi) }}
                        </q-item-label>
                      </q-item-section>

                      <q-item-section side class="column q-gutter-y-xs justify-center">
                        <q-btn flat round color="positive" icon="check_circle" @click.stop="approvePayment(props.row)">
                          <q-tooltip>Bayarkan (Paid)</q-tooltip>
                        </q-btn>
                        <q-btn flat round color="primary" icon="edit" @click.stop="editPendingTransaction(props.row)">
                          <q-tooltip>Edit Tagihan</q-tooltip>
                        </q-btn>
                        <q-btn flat round color="grey-7" icon="visibility" @click.stop="viewDetail(props.row)">
                          <q-tooltip>Lihat Detail</q-tooltip>
                        </q-btn>
                      </q-item-section>
                    </q-item>
                  </q-card>
                </div>
              </template>

              <template v-slot:body-cell-actions="props">
                <q-td :props="props" class="q-gutter-xs" align="center">
                  <q-btn flat round color="positive" icon="check_circle" size="sm" @click="approvePayment(props.row)">
                    <q-tooltip>Bayarkan (Paid)</q-tooltip>
                  </q-btn>
                  <q-btn flat round color="primary" icon="edit" size="sm" @click="editPendingTransaction(props.row)">
                    <q-tooltip>Edit Tagihan</q-tooltip>
                  </q-btn>
                  <q-btn flat round color="grey-7" icon="visibility" size="sm" @click="viewDetail(props.row)">
                    <q-tooltip>Lihat Detail</q-tooltip>
                  </q-btn>
                </q-td>
              </template>
              <template v-slot:body-cell-total_donasi="props">
                <q-td :props="props" align="right" class="text-weight-bold">
                  {{ formatCurrency(props.value) }}
                </q-td>
              </template>
            </q-table>
          </q-tab-panel>
        </q-tab-panels>
      </div>
    </div>

    <!-- Step 1: Select Donor Dialog -->
    <q-dialog v-model="selectionDialog.show">
      <q-card style="width: 500px; max-width: 90vw;">
        <q-card-section>
          <div class="text-h6">Pilih Donatur</div>
          <div class="text-caption">Cari donatur yang akan dijadikan donatur rutin</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-select
            v-model="selectedDonor"
            use-input
            hide-selected
            fill-input
            input-debounce="300"
            label="Cari Nama / No HP"
            :options="donorOptions"
            @filter="filterDonors"
            hint="Ketik minimal 3 karakter"
            outlined
            dense
          >
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey">Tidak ada hasil</q-item-section>
              </q-item>
            </template>
          </q-select>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Batal" v-close-popup />
          <q-btn color="primary" label="Lanjut" :disabled="!selectedDonor" @click="startCommitmentSetup" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Step 2: Manage Commitment Dialog -->
    <q-dialog v-model="commitmentDialog.show" persistent>
      <q-card style="width: 800px; max-width: 95vw;">
        <q-card-section class="row items-center">
          <div class="text-h6">Setup Komitmen Rutin: {{ commitmentForm.nama }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pa-md scroll" style="max-height: 70vh">
          <div class="row q-col-gutter-md">
            <!-- Basic Config -->
            <div class="col-12 col-sm-4">
              <q-select 
                v-model="commitmentForm.c_bayar" 
                :options="paymentMethods" 
                option-label="cara_bayar" 
                option-value="bayar_id"
                emit-value 
                map-options 
                label="Metode Bayar" 
                outlined 
                dense 
              />
            </div>
            <div class="col-12 col-sm-4">
              <q-input v-model="commitmentForm.kolektor" label="Kolektor" outlined dense />
            </div>
            <div class="col-12 col-sm-4">
              <q-input v-model="commitmentForm.marketer" label="Marketer" outlined dense />
            </div>

            <q-separator class="col-12 q-my-sm" />

            <!-- Products Table -->
            <div class="col-12">
              <div class="flex justify-between items-center q-mb-sm">
                <div class="text-subtitle2">Daftar Produk Donasi Rutin</div>
                <q-btn color="positive" icon="add" label="Tambah Produk" flat dense @click="addProductRow" />
              </div>

              <div v-for="(item, index) in commitmentForm.items" :key="index" class="row q-col-gutter-sm items-center q-mb-sm">
                <div class="col-12 col-sm-5">
                  <q-select v-model="item.produk_id" :options="allProducts" option-label="produk" option-value="produk_id"
                    emit-value map-options label="Pilih Produk" outlined dense 
                    @update:model-value="(val) => updateProductDetails(index, val)" />
                </div>
                <div class="col-6 col-sm-3">
                  <q-input v-model.number="item.price" label="Nominal" type="number" outlined dense />
                </div>
                <div class="col-4 col-sm-2">
                  <q-input v-model.number="item.qty" label="Qty" type="number" outlined dense />
                </div>
                <div class="col-2 col-sm-2">
                  <q-btn flat round color="negative" icon="delete" @click="removeProductRow(index)" />
                </div>
              </div>

              <div class="row justify-end q-mt-md">
                <div class="text-h6">Total: {{ formatCurrency(totalCommitment) }}</div>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Batal" v-close-popup />
          <q-btn color="primary" label="Simpan Komitmen" @click="saveCommitment" :loading="saving" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Detail Transaction Dialog -->
     <q-dialog v-model="showTxDetail">
       <q-card style="width: 400px">
         <q-card-section>
           <div class="text-h6">Detail Tagihan</div>
           <div class="text-subtitle2">{{ activeTx?.trans_id }}</div>
         </q-card-section>
         <q-card-section v-if="activeTx">
           <div class="row justify-between q-mb-xs">
             <div class="text-grey-7">Donatur:</div>
             <div class="text-weight-bold">{{ activeTx.donor_name || activeTx.donatur }}</div>
           </div>
           <div class="row justify-between q-mb-xs">
             <div class="text-grey-7">Status:</div>
             <div><q-badge color="orange">{{ activeTx.status }}</q-badge></div>
           </div>
           <q-separator class="q-my-md" />
           <div class="row justify-between text-h6">
             <div>Total:</div>
             <div>{{ formatCurrency(activeTx.total_donasi) }}</div>
           </div>
         </q-card-section>
         <q-card-actions align="right">
           <q-btn flat label="Tutup" v-close-popup />
           <q-btn color="positive" label="Proses Bayar" @click="approvePayment(activeTx)" />
         </q-card-actions>
       </q-card>
      </q-dialog>

      <!-- Edit Transaction Dialog -->
      <q-dialog v-model="editTxDialog.show" persistent>
        <q-card style="width: 800px; max-width: 95vw; border-radius: 12px;">
          <q-card-section class="row items-center q-pb-none">
            <div class="text-h6 text-weight-bold">Edit Detail Tagihan: {{ editTxForm.trans_id }}</div>
            <q-space />
            <q-btn icon="close" flat round dense v-close-popup />
          </q-card-section>

          <q-card-section class="q-pa-md scroll" style="max-height: 70vh">
            <div class="row q-col-gutter-md">
              <!-- Basic Config -->
              <div class="col-12 col-sm-4">
                <q-select 
                  v-model="editTxForm.payment_id" 
                  :options="paymentMethods" 
                  option-label="cara_bayar" 
                  option-value="bayar_id"
                  emit-value 
                  map-options 
                  label="Metode Bayar" 
                  outlined 
                  dense 
                />
              </div>
              <div class="col-12 col-sm-4">
                <q-input v-model="editTxForm.tgl" label="Tanggal Tagihan" type="date" outlined dense stack-label />
              </div>
              <div class="col-12 col-sm-4">
                <q-input v-model="editTxForm.keterangan" label="Keterangan Umum" outlined dense />
              </div>

              <q-separator class="col-12 q-my-sm" />

              <!-- Products Table -->
              <div class="col-12">
                <div class="flex justify-between items-center q-mb-sm">
                  <div class="text-subtitle2 text-weight-bold">Daftar Produk Donasi</div>
                  <q-btn color="positive" icon="add" label="Tambah Baris" flat dense @click="addEditTxProductRow" />
                </div>

                <div v-for="(item, index) in editTxForm.items" :key="index" class="row q-col-gutter-sm items-center q-mb-sm">
                  <div class="col-12 col-sm-4">
                    <q-select v-model="item.produk_id" :options="allProducts" option-label="produk" option-value="produk_id"
                      emit-value map-options label="Pilih Produk" outlined dense 
                      @update:model-value="(val) => updateEditTxProductDetails(index, val)" />
                  </div>
                  <div class="col-4 col-sm-2">
                    <q-input v-model.number="item.price" label="Nominal" type="number" outlined dense />
                  </div>
                  <div class="col-3 col-sm-2">
                    <q-input v-model.number="item.qty" label="Qty" type="number" outlined dense />
                  </div>
                  <div class="col-3 col-sm-3">
                    <q-input v-model="item.keterangan" label="Keterangan Item" outlined dense />
                  </div>
                  <div class="col-2 col-sm-1 text-center">
                    <q-btn flat round color="negative" icon="delete" @click="removeEditTxProductRow(index)" />
                  </div>
                </div>

                <div class="row justify-end q-mt-md">
                  <div class="text-h6 text-primary text-weight-bold">Total Tagihan: {{ formatCurrency(totalEditTxValue) }}</div>
                </div>
              </div>
            </div>
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Batal" v-close-popup />
            <q-btn color="primary" label="Simpan Perubahan" @click="saveTransactionEdit" :loading="savingEditTx" unelevated class="rounded-borders" />
          </q-card-actions>
        </q-card>
      </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, onMounted, computed, reactive } from 'vue'
import { api } from 'src/api'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'stores/auth'

const $q = useQuasar()
const authStore = useAuthStore()
const isAdmin = computed(() => authStore.isAdmin)

const tab = ref('donors')
const loadingDonors = ref(false)
const loadingPending = ref(false)
const saving = ref(false)

const searchDonor = ref('')
const searchPending = ref('')

// Edit Transaction State
const editTxDialog = reactive({ show: false })
const savingEditTx = ref(false)
const editTxForm = reactive({
  trans_id: '',
  payment_id: '',
  tgl: '',
  keterangan: '',
  items: []
})

const totalEditTxValue = computed(() => {
  return editTxForm.items.reduce((sum, i) => sum + (Number(i.price) * (i.qty || 1)), 0)
})

const addEditTxProductRow = () => {
  editTxForm.items.push({ produk_id: null, price: 0, qty: 1, keterangan: '' })
}

const removeEditTxProductRow = (index) => {
  editTxForm.items.splice(index, 1)
}

const updateEditTxProductDetails = (index, productId) => {
  const p = allProducts.value.find(x => x.produk_id === productId)
  if (p) {
    editTxForm.items[index].price = p.price
  }
}

const editPendingTransaction = async (row) => {
  $q.loading.show({ message: 'Memuat data tagihan...' })
  try {
    const response = await api.get(`/transactions/${row.trans_id || row.id}`)
    const trxData = response.data
    
    Object.assign(editTxForm, {
      trans_id: trxData.id,
      payment_id: paymentMethods.value.find(p => p.cara_bayar === trxData.payment_method)?.bayar_id || trxData.payment_method,
      tgl: trxData.date ? trxData.date.split('T')[0] : '',
      keterangan: trxData.keterangan || '',
      items: (trxData.items || []).map(item => {
        const foundProd = allProducts.value.find(p => p.produk === item.produk_name);
        return {
          produk_id: foundProd ? foundProd.produk_id : item.produk_id,
          price: item.price,
          qty: item.qty,
          keterangan: item.keterangan || ''
        };
      })
    })

    editTxDialog.show = true
  } catch (error) {
    console.error('Failed to load transaction for edit:', error)
    $q.notify({ color: 'negative', message: 'Gagal memuat data transaksi' })
  } finally {
    $q.loading.hide()
  }
}

const saveTransactionEdit = async () => {
  if (editTxForm.items.length === 0) {
    $q.notify({ color: 'warning', message: 'Minimal harus ada 1 produk' })
    return
  }
  if (editTxForm.items.some(i => !i.produk_id)) {
    $q.notify({ color: 'warning', message: 'Silakan pilih produk untuk semua baris' })
    return
  }

  savingEditTx.value = true
  try {
    const payload = {
      payment_id: editTxForm.payment_id,
      tgl: editTxForm.tgl,
      keterangan: editTxForm.keterangan,
      items: editTxForm.items
    }
    await api.put(`/transactions/${editTxForm.trans_id}`, payload)
    $q.notify({ color: 'positive', message: 'Transaksi berhasil diperbarui' })
    editTxDialog.show = false
    fetchData()
  } catch (err) {
    console.error('Failed to update transaction:', err)
    $q.notify({ color: 'negative', message: err.response?.data?.message || 'Gagal menyimpan perubahan transaksi' })
  } finally {
    savingEditTx.value = false
  }
}

const routineDonors = ref([])
const pendingTx = ref([])
const allProducts = ref([])
const paymentMethods = ref([])

const getPaymentMethodName = (val) => {
  const pm = paymentMethods.value.find(p => p.bayar_id === val || p.cara_bayar === val)
  return pm ? pm.cara_bayar : val
}

const donorColumns = computed(() => [
  { name: 'donatur_id', label: 'ID', field: 'donatur_id', align: 'left', sortable: true },
  { name: 'nama', label: 'Nama', field: 'nama', align: 'left', sortable: true },
  { name: 'no_hp', label: 'HP', field: 'no_hp', align: 'left' },
  { 
    name: 'c_bayar', 
    label: 'Metode', 
    field: 'c_bayar', 
    align: 'left',
    format: val => {
      const pm = paymentMethods.value.find(p => p.bayar_id === val || p.cara_bayar === val)
      return pm ? pm.cara_bayar : val
    }
  },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'actions', label: 'Aksi', align: 'center' }
])

const txColumns = [
  { name: 'date', label: 'Tgl Tagihan', field: 'tgl', align: 'left', format: val => val ? (val.split('T')[0]) : '-' },
  { name: 'id', label: 'ID Transaksi', field: 'trans_id', align: 'left' },
  { name: 'donor', label: 'Donatur', field: 'donor_name', align: 'left' },
  { name: 'total_donasi', label: 'Nominal', field: 'total_donasi', align: 'right' },
  { name: 'actions', label: 'Aksi', align: 'center' }
]

// Selection Dialog
const selectionDialog = reactive({ show: false })
const selectedDonor = ref(null)
const donorOptions = ref([])

// Commitment Dialog
const commitmentDialog = reactive({ show: false })
const commitmentForm = reactive({
  donatur_id: '',
  nama: '',
  c_bayar: 'CASH',
  kolektor: '',
  marketer: '',
  items: []
})

const totalCommitment = computed(() => {
  return commitmentForm.items.reduce((sum, i) => sum + (Number(i.price) * (i.qty || 1)), 0)
})

// Detail Dialog
const showTxDetail = ref(false)
const activeTx = ref(null)

const fetchData = async () => {
  loadingDonors.value = true
  loadingPending.value = true
  try {
    const [resDon, resPend, resProd, resPay] = await Promise.all([
      api.get('/routine/donors'),
      api.get('/transactions', { params: { status: 'PENDING', limit: 100 } }),
      api.get('/master/product'),
      api.get('/master/payment-method')
    ])
    routineDonors.value = resDon.data
    pendingTx.value = resPend.data.data || resPend.data // Depending on exact API response structure
    allProducts.value = resProd.data
    paymentMethods.value = resPay.data
  } catch (err) {
    console.error(err)
  } finally {
    loadingDonors.value = false
    loadingPending.value = false
  }
}

const filterDonors = async (val, update) => {
  if (val.length < 3) {
    update(() => { donorOptions.value = [] })
    return
  }
  try {
    const res = await api.get('/master/donatur', { params: { search: val } })
    update(() => {
      const donors = Array.isArray(res.data) ? res.data : (res.data?.data || [])
      donorOptions.value = donors.map(d => ({
        label: `${d.nama} (${d.no_hp})`,
        value: d.donatur_id,
        data: d
      }))
    })
  } catch (err) {}
}

const openSelectionDialog = () => {
  selectedDonor.value = null
  selectionDialog.show = true
}

const startCommitmentSetup = async () => {
  const d = selectedDonor.value.data
  Object.assign(commitmentForm, {
    donatur_id: d.donatur_id,
    nama: d.nama,
    c_bayar: d.c_bayar || 'CASH',
    kolektor: d.kolektor || '',
    marketer: d.marketer || '',
    items: []
  })
  
  // Try fetch existing products
  try {
    const res = await api.get(`/routine/products/${d.donatur_id}`)
    if (res.data && res.data.length > 0) {
      commitmentForm.items = res.data.map(r => ({
        produk_id: r.produk,
        price: r.price,
        qty: r.qty
      }))
    } else {
      addProductRow()
    }
  } catch (e) {
    addProductRow()
  }

  selectionDialog.show = false
  commitmentDialog.show = true
}

const editCommitment = async (donor) => {
  Object.assign(commitmentForm, {
    donatur_id: donor.donatur_id,
    nama: donor.nama,
    c_bayar: donor.c_bayar,
    kolektor: donor.kolektor,
    marketer: donor.marketer,
    items: []
  })

  try {
    const res = await api.get(`/routine/products/${donor.donatur_id}`)
    commitmentForm.items = res.data.map(r => ({
      produk_id: r.produk,
      price: r.price,
      qty: r.qty
    }))
  } catch (e) {
    console.error('Failed to fetch routine products:', e)
    $q.notify({ color: 'negative', message: 'Gagal mengambil data produk rutin' })
    // We still show the dialog so they can re-setup
    commitmentForm.items = [{ produk_id: null, price: 0, qty: 1 }]
  }
  commitmentDialog.show = true
}

const addProductRow = () => {
  commitmentForm.items.push({ produk_id: null, price: 0, qty: 1 })
}

const removeProductRow = (index) => {
  commitmentForm.items.splice(index, 1)
}

const updateProductDetails = (index, productId) => {
  const p = allProducts.value.find(x => x.produk_id === productId)
  if (p) {
    commitmentForm.items[index].price = p.price
  }
}

const saveCommitment = async () => {
  if (commitmentForm.items.length === 0) {
    $q.notify({ color: 'warning', message: 'Minimal harus ada 1 produk' })
    return
  }
  
  saving.value = true
  try {
    const payload = {
      donatur_id: commitmentForm.donatur_id,
      products: commitmentForm.items,
      c_bayar: commitmentForm.c_bayar,
      kolektor: commitmentForm.kolektor,
      marketer: commitmentForm.marketer
    }
    await api.post('/routine/save', payload)
    $q.notify({ color: 'positive', message: 'Berhasil menyimpan komitmen rutin' })
    commitmentDialog.show = false
    fetchData()
  } catch (err) {
    $q.notify({ color: 'negative', message: 'Gagal menyimpan komitmen' })
  } finally {
    saving.value = false
  }
}

const approvePayment = (tx) => {
  $q.dialog({
    title: 'Konfirmasi Pembayaran',
    message: `Lunaskan tagihan rutin senilai ${formatCurrency(tx.total_donasi)} untuk ${tx.donor_name}?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await api.post(`/transactions/${tx.trans_id}/approve`)
      $q.notify({ color: 'positive', message: 'Tagihan rutin berhasil dibayarkan & Jurnal otomatis telah dibuat' })
      fetchData()
      showTxDetail.value = false
    } catch (err) {
      console.error(err)
      $q.notify({ color: 'negative', message: err.response?.data?.message || 'Gagal memproses pembayaran' })
    }
  })
}

const viewDetail = (tx) => {
  activeTx.value = tx
  showTxDetail.value = true
}

const promptYearlyGenerate = () => {
  const nextYear = new Date().getFullYear() + 1
  $q.dialog({
    title: 'Generate Tahunan',
    message: `Generate seluruh tagihan rutin untuk tahun ${nextYear}? Sistem akan mengecek donatur yang masih aktif saja.`,
    options: {
      type: 'radio',
      model: nextYear.toString(),
      items: [
        { label: `Tahun ${nextYear}`, value: nextYear.toString() },
        { label: `Tahun Berjalan (${nextYear-1})`, value: (nextYear-1).toString() }
      ]
    },
    cancel: true,
    persistent: true
  }).onOk(async (year) => {
    try {
      $q.loading.show({ message: 'Generating transactions...' })
      const res = await api.post('/routine/generate-yearly', { year: parseInt(year) })
      $q.notify({ color: 'positive', message: res.data.message })
      fetchData()
    } catch (err) {
      $q.notify({ color: 'negative', message: 'Gagal generate tahunan' })
    } finally {
      $q.loading.hide()
    }
  })
}

const formatCurrency = (val) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val)
}

onMounted(fetchData)
</script>

<style scoped>
.rounded-borders { border-radius: 8px; }
.bg-grey-1 { background-color: #f8f9fa; }
</style>
