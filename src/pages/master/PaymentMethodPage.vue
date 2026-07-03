<template>
  <q-page padding class="bg-grey-1">
    <div class="row q-col-gutter-md justify-center">
      <!-- Header Section -->
      <div class="col-12 col-md-10 flex justify-between items-center q-mb-md">
        <div>
          <h1 class="text-h5 q-my-none text-weight-bold text-primary">Cara Bayar</h1>
          <div class="text-caption text-grey-7">Kelola metode pembayaran dan link akun COA</div>
        </div>
        <q-btn
          color="primary"
          icon="add"
          label="Tambah Metode"
          @click="openDialog()"
          unelevated
          class="rounded-borders"
        />
      </div>

      <!-- Search & Filter Card -->
      <div class="col-12 col-md-10">
        <q-card flat bordered class="bg-white q-pa-sm rounded-lg">
          <div class="row q-col-gutter-sm items-center">
            <div class="col-12 col-sm-8">
              <q-input v-model="filter" dense filled borderless placeholder="Cari metode atau tipe bayar..." clearable>
                <template v-slot:prepend>
                  <q-icon name="search" color="primary" />
                </template>
              </q-input>
            </div>
            <div class="col-12 col-sm-4 text-right">
              <q-btn flat color="grey-7" icon="refresh" label="Muat Ulang" @click="fetchData" :loading="loading" />
            </div>
          </div>
        </q-card>
      </div>

      <!-- Payment Cards List -->
      <div class="col-12 col-md-10">
        <div class="row q-col-gutter-md">
          <div v-for="row in filteredRows" :key="row.bayar_id" class="col-12 col-sm-6">
            <q-card flat bordered class="payment-card hover-shadow transition-all">
              <q-card-section>
                <div class="row items-center justify-between no-wrap">
                  <div class="col">
                    <div class="text-overline text-primary">ID: {{ row.bayar_id }}</div>
                    <div class="text-h6 text-weight-bolder leading-tight">{{ row.cara_bayar }}</div>
                    <q-badge :color="row.on_off === 'ON' ? 'positive' : 'grey-7'" class="q-mt-xs">
                      {{ row.on_off === 'ON' ? 'Aktif' : 'Non-Aktif' }}
                    </q-badge>
                  </div>
                  <q-avatar size="48px" :icon="row.tipe_bayar?.toLowerCase().includes('bank') ? 'account_balance' : 'payments'" color="blue-1" text-color="blue" />
                </div>
              </q-card-section>

              <q-card-section class="q-py-sm">
                <div class="row q-col-gutter-sm">
                  <div class="col-6">
                    <div class="text-caption text-grey-7">Tipe Bayar</div>
                    <div class="text-subtitle2">{{ row.tipe_bayar || '-' }}</div>
                  </div>
                  <div class="col-6 text-right">
                    <div class="text-caption text-grey-7">Kantor</div>
                    <div class="text-subtitle2">{{ row.office || 'Global' }}</div>
                  </div>
                </div>
              </q-card-section>

              <q-card-section class="q-py-xs bg-blue-grey-1">
                <div class="row items-center no-wrap">
                  <q-icon name="link" color="blue-grey-4" size="18px" class="q-mr-sm" />
                  <div class="text-caption text-blue-grey-8 text-weight-bold truncate">
                    AKUN COA: {{ getAccountDisplay(row.akun) }}
                  </div>
                </div>
              </q-card-section>

              <q-separator />

              <q-card-actions align="right" class="q-pa-sm">
                <q-btn flat round color="primary" icon="edit" size="sm" @click="openDialog(row)">
                  <q-tooltip>Edit Metode</q-tooltip>
                </q-btn>
                <q-btn flat round color="negative" icon="delete" size="sm" @click="confirmDelete(row)">
                  <q-tooltip>Hapus Metode</q-tooltip>
                </q-btn>
              </q-card-actions>
            </q-card>
          </div>

          <!-- Empty State -->
          <div v-if="filteredRows.length === 0 && !loading" class="col-12 text-center q-pa-xl">
            <q-icon name="credit_card_off" size="84px" color="grey-4" />
            <div class="text-h6 text-grey-5 q-mt-md">Tidak ada data metode bayar</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Dialog Form -->
    <q-dialog v-model="dialog.show" persistent>
      <q-card style="width: 450px; max-width: 95vw; border-radius: 16px">
        <q-card-section class="row items-center bg-primary text-white">
          <div class="text-h6">{{ dialog.editMode ? 'Edit' : 'Tambah' }} Metode</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pa-lg">
          <q-form @submit="save" class="q-gutter-md">
            <q-input
              v-model="form.bayar_id"
              label="ID Bayar (e.g. BSI-01)"
              :readonly="dialog.editMode"
              filled
              :rules="[val => !!val || 'ID wajib diisi']"
            />
            <q-input v-model="form.tipe_bayar" label="Tipe Bayar (Bank, Tunai, QRIS)" filled />
            <q-input v-model="form.cara_bayar" label="Nama Transaksi (e.g. Bank BSI BMH)" filled :rules="[val => !!val || 'Nama wajib diisi']" />
            
            <q-select
              v-model="form.office"
              :options="offices"
              option-label="kantor"
              option-value="officeid"
              emit-value
              map-options
              label="Batas Kantor (Kosongkan jika semua)"
              filled
              clearable
            />

            <q-select
              v-model="form.akun"
              :options="accountOptions"
              option-label="label"
              option-value="coa"
              emit-value
              map-options
              use-input
              input-debounce="300"
              @filter="filterAccounts"
              label="Pilih Akun COA (Wajib untuk Jurnal)"
              filled
              :rules="[val => !!val || 'Akun wajib diisi untuk otomatisasi jurnal']"
            >
              <template v-slot:option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section>
                    <q-item-label>{{ scope.opt.coa }}</q-item-label>
                    <q-item-label caption>{{ scope.opt.perkiraan }}</q-item-label>
                  </q-item-section>
                </q-item>
              </template>
              <template v-slot:no-option>
                <q-item>
                  <q-item-section class="text-grey">
                    Tidak ada hasil
                  </q-item-section>
                </q-item>
              </template>
            </q-select>

            <q-select
              v-model="form.on_off"
              :options="['ON', 'OFF']"
              label="Status Aktif"
              filled
            />

            <div class="row justify-end q-mt-lg q-gutter-sm">
              <q-btn label="Batal" color="grey" flat v-close-popup />
              <q-btn :label="dialog.editMode ? 'Update Metode' : 'Simpan Metode'" type="submit" color="primary" :loading="saving" unelevated class="rounded-borders" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Delete Confirmation -->
    <q-dialog v-model="deleteConfirm.show">
      <q-card style="border-radius: 16px">
        <q-card-section class="row items-center q-pb-none">
          <q-avatar icon="warning" color="negative" text-color="white" />
          <div class="text-h6 q-ml-md">Hapus Metode</div>
        </q-card-section>

        <q-card-section class="q-pt-md">
          Apa Anda yakin ingin menghapus <strong>{{ deleteConfirm.data?.cara_bayar }}</strong>?
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Batal" color="grey-7" v-close-popup />
          <q-btn unelevated label="Hapus" color="negative" @click="doDelete" :loading="deleting" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue'
import { api } from 'src/api'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const filter = ref('')
const rows = ref([])
const offices = ref([])
const accounts = ref([])
const accountOptions = ref([])

const filteredRows = computed(() => {
  if (!filter.value) return rows.value
  const term = filter.value.toLowerCase()
  return rows.value.filter(r => 
    r.cara_bayar?.toLowerCase().includes(term) || 
    r.bayar_id?.toLowerCase().includes(term) || 
    r.tipe_bayar?.toLowerCase().includes(term)
  )
})

const form = reactive({
  bayar_id: '',
  tipe_bayar: '',
  cara_bayar: '',
  office: '',
  on_off: 'ON',
  akun: ''
})

const dialog = reactive({
  show: false,
  editMode: false
})

const deleteConfirm = reactive({
  show: false,
  data: null
})

const fetchData = async () => {
  loading.value = true
  try {
    const [resPay, resOff, resAcc] = await Promise.all([
      api.get('/master/payment-method'),
      api.get('/master/office'),
      api.get('/master/coa')
    ])
    rows.value = resPay.data
    offices.value = resOff.data
    accounts.value = resAcc.data.map(acc => ({
      ...acc,
      label: `${acc.coa} - ${acc.perkiraan}`
    }))
    accountOptions.value = accounts.value
  } catch (err) {
    $q.notify({ color: 'negative', message: 'Gagal mengambil data' })
  } finally {
    loading.value = false
  }
}

const openDialog = (data = null) => {
  if (data) {
    Object.assign(form, data)
    dialog.editMode = true
  } else {
    Object.assign(form, { bayar_id: '', tipe_bayar: '', cara_bayar: '', office: '', on_off: 'ON', akun: '' })
    dialog.editMode = false
  }
  dialog.show = true
}

const save = async () => {
  saving.value = true
  try {
    if (dialog.editMode) {
      await api.put(`/master/payment-method/${form.bayar_id}`, form)
      $q.notify({ color: 'positive', message: 'Metode bayar berhasil diupdate' })
    } else {
      await api.post('/master/payment-method', form)
      $q.notify({ color: 'positive', message: 'Metode bayar berhasil ditambahkan' })
    }
    dialog.show = false
    fetchData()
  } catch (err) {
    $q.notify({ color: 'negative', message: 'Gagal menyimpan data' })
  } finally {
    saving.value = false
  }
}

const confirmDelete = (data) => {
  deleteConfirm.data = data
  deleteConfirm.show = true
}

const doDelete = async () => {
  deleting.value = true
  try {
    await api.delete(`/master/payment-method/${deleteConfirm.data.bayar_id}`)
    $q.notify({ color: 'positive', message: 'Data berhasil dihapus' })
    deleteConfirm.show = false
    fetchData()
  } catch (err) {
    $q.notify({ color: 'negative', message: 'Gagal menghapus data' })
  } finally {
    deleting.value = false
  }
}

const filterAccounts = (val, update) => {
  if (val === '') {
    update(() => {
      accountOptions.value = accounts.value
    })
    return
  }

  update(() => {
    const needle = val.toLowerCase()
    accountOptions.value = accounts.value.filter(v => 
      v.label.toLowerCase().indexOf(needle) > -1
    )
  })
}

const getAccountDisplay = (coa) => {
  if (!coa) return 'Belum ditautkan'
  const acc = accounts.value.find(a => a.coa === coa)
  return acc ? `${acc.coa} - ${acc.perkiraan}` : coa
}

onMounted(fetchData)
</script>

<style scoped>
.payment-card {
  border-radius: 16px;
  background: white;
}
.hover-shadow:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.06) !important;
}
.rounded-lg {
  border-radius: 12px;
}
.transition-all {
  transition: all 0.3s ease;
}
.leading-tight {
  line-height: 1.2;
}
.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
