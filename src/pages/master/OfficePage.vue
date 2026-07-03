<template>
  <q-page padding class="bg-grey-1">
    <div class="row q-col-gutter-md justify-center">
      <!-- Header Section -->
      <div class="col-12 col-md-11 flex justify-between items-center q-mb-md">
        <div>
          <h1 class="text-h5 q-my-none text-weight-bold text-primary">Manajemen Kantor</h1>
          <div class="text-caption text-grey-7">Daftar kantor cabang dan perwakilan</div>
        </div>
        <q-btn
          color="primary"
          icon="add"
          label="Tambah Kantor"
          @click="openDialog()"
          unelevated
          class="rounded-borders"
        />
      </div>

      <!-- Search & Filter Card -->
      <div class="col-12 col-md-11">
        <q-card flat bordered class="bg-white q-pa-sm rounded-lg">
          <div class="row q-col-gutter-sm items-center">
            <div class="col-12 col-sm-8">
              <q-input v-model="filter" dense filled borderless placeholder="Cari nama atau kode kantor..." clearable>
                <template v-slot:prepend>
                  <q-icon name="search" color="primary" />
                </template>
              </q-input>
            </div>
            <div class="col-12 col-sm-4 text-right">
              <q-btn flat color="grey-7" icon="refresh" label="Muat Ulang" @click="fetchOffices" :loading="loading" />
            </div>
          </div>
        </q-card>
      </div>

      <!-- Office List Table / Grid -->
      <div class="col-12 col-md-11">
        <q-table
          :rows="filteredRows"
          :columns="columns"
          row-key="officeid"
          :loading="loading"
          v-model:pagination="pagination"
          flat
          bordered
          :grid="$q.screen.lt.md"
          class="bg-white rounded-lg shadow-1"
        >
          <!-- Custom item template for mobile grid -->
          <template v-slot:item="props">
            <div class="col-12 col-sm-6 q-pa-sm">
              <q-card flat bordered class="office-card hover-shadow transition-all">
                <q-card-section>
                  <div class="row items-center justify-between no-wrap">
                    <div class="col">
                      <div class="text-overline text-primary">KODE: {{ props.row.officeid }}</div>
                      <div class="text-h6 text-weight-bolder leading-tight">{{ props.row.kantor }}</div>
                      <div class="text-subtitle2 text-grey-7 q-mt-xs">
                        <q-icon name="apartment" size="16px" class="q-mr-xs" />
                        {{ props.row.kota || 'Kota tidak diset' }}
                      </div>
                    </div>
                    <q-avatar color="blue-1" text-color="primary" icon="business" />
                  </div>
                </q-card-section>

                <q-card-section class="q-pt-none">
                  <div class="text-caption text-grey-6 flex items-start no-wrap">
                    <q-icon name="place" size="16px" class="q-mr-xs text-negative" />
                    <span class="ellipsis-2-lines">{{ props.row.alamat || 'Alamat belum diatur' }}</span>
                  </div>
                </q-card-section>

                <q-card-section class="q-py-xs bg-grey-2">
                  <div class="row q-col-gutter-md">
                    <div class="col-6">
                      <div class="text-tiny text-grey-6 uppercase">WA API</div>
                      <div class="text-caption text-weight-bold truncate">
                        <q-icon :name="props.row.wa_api ? 'check_circle' : 'cancel'" :color="props.row.wa_api ? 'positive' : 'grey-5'" size="14px" />
                        {{ props.row.wa_api ? 'Terhubung' : 'Belum' }}
                      </div>
                    </div>
                    <div class="col-6 text-right">
                      <div class="text-tiny text-grey-6 uppercase">WA Prodaya</div>
                      <div class="text-caption text-weight-bold truncate">
                        <q-icon :name="props.row.wa_prodaya ? 'check_circle' : 'cancel'" :color="props.row.wa_prodaya ? 'positive' : 'grey-5'" size="14px" />
                        {{ props.row.wa_prodaya ? 'Terhubung' : 'Belum' }}
                      </div>
                    </div>
                  </div>
                </q-card-section>

                <q-separator />

                <q-card-actions align="right" class="q-pa-sm">
                  <q-btn flat round color="primary" icon="edit" size="sm" @click="openDialog(props.row)">
                    <q-tooltip>Edit Kantor</q-tooltip>
                  </q-btn>
                  <q-btn flat round color="negative" icon="delete" size="sm" @click="confirmDelete(props.row)">
                    <q-tooltip>Hapus Kantor</q-tooltip>
                  </q-btn>
                </q-card-actions>
              </q-card>
            </div>
          </template>

          <!-- Custom body cells for desktop table -->
          <template v-slot:body-cell-wa_api="props">
            <q-td :props="props" align="center">
              <q-chip
                :color="props.row.wa_api ? 'positive' : 'grey-4'"
                :text-color="props.row.wa_api ? 'white' : 'dark'"
                dense
                size="sm"
                class="text-weight-bold"
              >
                <q-icon :name="props.row.wa_api ? 'check' : 'close'" size="14px" class="q-mr-xs" />
                {{ props.row.wa_api ? 'Terhubung' : 'Belum Set' }}
              </q-chip>
            </q-td>
          </template>

          <template v-slot:body-cell-wa_prodaya="props">
            <q-td :props="props" align="center">
              <q-chip
                :color="props.row.wa_prodaya ? 'positive' : 'grey-4'"
                :text-color="props.row.wa_prodaya ? 'white' : 'dark'"
                dense
                size="sm"
                class="text-weight-bold"
              >
                <q-icon :name="props.row.wa_prodaya ? 'check' : 'close'" size="14px" class="q-mr-xs" />
                {{ props.row.wa_prodaya ? 'Terhubung' : 'Belum Set' }}
              </q-chip>
            </q-td>
          </template>

          <template v-slot:body-cell-actions="props">
            <q-td :props="props" align="center">
              <div class="q-gutter-xs">
                <q-btn flat round color="primary" icon="edit" size="sm" @click="openDialog(props.row)">
                  <q-tooltip>Edit Kantor</q-tooltip>
                </q-btn>
                <q-btn flat round color="negative" icon="delete" size="sm" @click="confirmDelete(props.row)">
                  <q-tooltip>Hapus Kantor</q-tooltip>
                </q-btn>
              </div>
            </q-td>
          </template>

        </q-table>
      </div>
    </div>

    <!-- Dialog Form -->
    <q-dialog v-model="dialog.show" persistent>
      <q-card style="width: 500px; max-width: 95vw; border-radius: 16px">
        <q-card-section class="row items-center bg-primary text-white">
          <div class="text-h6">{{ dialog.editMode ? 'Edit' : 'Tambah' }} Kantor</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pa-lg">
          <q-form @submit="save" class="q-gutter-md">
            <q-input
              v-model="form.officeid"
              label="ID Kantor (Kode)"
              :readonly="dialog.editMode"
              filled
              :rules="[val => !!val || 'ID Kantor wajib diisi']"
            />
            <q-input v-model="form.kantor" label="Nama Kantor" filled :rules="[val => !!val || 'Nama wajib diisi']" />
            <q-input v-model="form.kota" label="Kota" filled />
            <q-input v-model="form.alamat" label="Alamat" filled type="textarea" autogrow />
            
            <div class="text-subtitle2 text-grey-7 q-mt-md">Integrasi WhatsApp</div>
            <q-input v-model="form.wa_api" label="WhatsApp API Key" filled placeholder="API Key untuk notifikasi" />
            <q-input v-model="form.wa_prodaya" label="WhatsApp Prodaya" filled placeholder="ID Layanan Prodaya" />

            <div class="row justify-end q-mt-lg q-gutter-sm">
              <q-btn label="Batal" color="grey" flat v-close-popup />
              <q-btn :label="dialog.editMode ? 'Update Kantor' : 'Simpan Kantor'" type="submit" color="primary" :loading="saving" unelevated class="rounded-borders" />
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
          <div class="text-h6 q-ml-md">Hapus Kantor</div>
        </q-card-section>

        <q-card-section class="q-pt-md">
          Apa Anda yakin ingin menghapus kantor <strong>{{ deleteConfirm.data?.kantor }}</strong>? Tindakan ini tidak dapat dibatalkan.
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

const columns = [
  { name: 'officeid', label: 'Kode Kantor', field: 'officeid', align: 'left', sortable: true },
  { name: 'kantor', label: 'Nama Kantor', field: 'kantor', align: 'left', sortable: true },
  { name: 'kota', label: 'Kota', field: 'kota', align: 'left', sortable: true },
  { name: 'alamat', label: 'Alamat', field: 'alamat', align: 'left' },
  { name: 'wa_api', label: 'Status WA API', field: 'wa_api', align: 'center' },
  { name: 'wa_prodaya', label: 'Status WA Prodaya', field: 'wa_prodaya', align: 'center' },
  { name: 'actions', label: 'Aksi', align: 'center' }
]

const pagination = ref({
  sortBy: 'officeid',
  descending: false,
  page: 1,
  rowsPerPage: 10
})

const filteredRows = computed(() => {
  const sorted = [...rows.value].sort((a, b) => {
    const codeA = String(a.officeid || '')
    const codeB = String(b.officeid || '')
    return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' })
  })
  
  if (!filter.value) return sorted
  const term = filter.value.toLowerCase()
  return sorted.filter(r => 
    r.kantor?.toLowerCase().includes(term) || 
    r.officeid?.toLowerCase().includes(term) || 
    r.kota?.toLowerCase().includes(term)
  )
})

const form = reactive({
  officeid: '',
  kantor: '',
  kota: '',
  alamat: '',
  wa_api: '',
  wa_prodaya: ''
})

const dialog = reactive({
  show: false,
  editMode: false
})

const deleteConfirm = reactive({
  show: false,
  data: null
})

const fetchOffices = async () => {
  loading.value = true
  try {
    const res = await api.get('/master/office')
    rows.value = res.data
  } catch (err) {
    $q.notify({ color: 'negative', message: 'Gagal mengambil data kantor' })
  } finally {
    loading.value = false
  }
}

const openDialog = (data = null) => {
  if (data) {
    Object.assign(form, data)
    dialog.editMode = true
  } else {
    Object.assign(form, { officeid: '', kantor: '', kota: '', alamat: '', wa_api: '', wa_prodaya: '' })
    dialog.editMode = false
  }
  dialog.show = true
}

const save = async () => {
  saving.value = true
  try {
    if (dialog.editMode) {
      await api.put(`/master/office/${form.officeid}`, form)
      $q.notify({ color: 'positive', message: 'Kantor berhasil diupdate' })
    } else {
      await api.post('/master/office', form)
      $q.notify({ color: 'positive', message: 'Kantor berhasil ditambahkan' })
    }
    dialog.show = false
    fetchOffices()
  } catch (err) {
    $q.notify({ color: 'negative', message: 'Terjadi kesalahan sistem' })
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
    await api.delete(`/master/office/${deleteConfirm.data.officeid}`)
    $q.notify({ color: 'positive', message: 'Kantor berhasil dihapus' })
    deleteConfirm.show = false
    fetchOffices()
  } catch (err) {
    $q.notify({ color: 'negative', message: 'Gagal menghapus data' })
  } finally {
    deleting.value = false
  }
}

onMounted(fetchOffices)
</script>

<style scoped>
.office-card {
  border-radius: 16px;
  background: white;
  overflow: hidden;
}
.primary-light {
  background-color: #e3f2fd;
}
.hover-shadow:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.08) !important;
}
.rounded-lg {
  border-radius: 12px;
}
.transition-all {
  transition: all 0.3s ease;
}
.leading-tight {
  line-height: 1.25;
}
.text-tiny {
  font-size: 0.65rem;
  letter-spacing: 0.05em;
  font-weight: 700;
}
.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
