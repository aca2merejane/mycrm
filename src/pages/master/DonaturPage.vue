<template>
  <q-page padding class="bg-grey-1">
    <div class="row q-col-gutter-md justify-center">
      <!-- Header -->
      <div class="col-12 flex justify-between items-center q-mb-md">
        <div>
          <h1 class="text-h5 q-my-none text-weight-bold text-primary">Data Donatur</h1>
          <div class="text-caption text-grey-7">Manajemen basis data donatur dan muzakki</div>
        </div>
        <q-btn
          color="primary"
          icon="add"
          label="Donatur Baru"
          @click="openDialog()"
          unelevated
          class="rounded-borders"
        />
      </div>

      <!-- Table / Grid -->
      <div class="col-12">
        <q-table
          :rows="rows"
          :columns="columns"
          row-key="donatur_id"
          :filter="filter"
          :loading="loading"
          flat
          bordered
          :grid="$q.screen.lt.md"
          :pagination="pagination"
          @request="fetchData"
          class="donatur-table bg-white rounded-lg shadow-1"
        >
          <!-- Search Header -->
          <template v-slot:top-right>
            <div class="row q-col-gutter-sm items-center">
              <div class="col-auto">
                <q-select
                  v-model="officeFilter"
                  :options="offices"
                  option-value="officeid"
                  option-label="kantor_label"
                  emit-value
                  map-options
                  dense
                  filled
                  borderless
                  label="Filter Kantor"
                  clearable
                  style="min-width: 200px"
                />
              </div>
              <div class="col-auto">
                <q-input v-model="filter" dense filled borderless placeholder="Cari Nama, Alamat, HP..." style="min-width: 250px" debounce="500">
                  <template v-slot:prepend>
                    <q-icon name="search" color="primary" />
                  </template>
                </q-input>
              </div>
            </div>
          </template>

          <!-- MOBILE VIEW (Grid Slot) -->
          <template v-slot:item="props">
            <div class="q-pa-xs col-12">
              <q-card flat bordered class="mobile-donatur-card">
                <q-item clickable @click="openDialog(props.row)">
                  <q-item-section avatar>
                    <q-avatar color="primary-faded" text-color="primary" icon="person" />
                  </q-item-section>

                  <q-item-section>
                    <q-item-label class="text-weight-bold text-subtitle1">{{ props.row.nama }}</q-item-label>
                    <q-item-label caption class="flex items-center">
                      <q-icon name="phone" size="14px" class="q-mr-xs" />
                      {{ props.row.no_hp }}
                    </q-item-label>
                    <q-item-label caption>
                      <q-badge outline color="grey-7" size="xs">{{ props.row.kategori }}</q-badge>
                    </q-item-label>
                  </q-item-section>

                  <q-item-section side>
                    <div class="column q-gutter-xs">
                      <q-btn flat round color="positive" icon="fab fa-whatsapp" size="sm" @click.stop="openWA(props.row.no_hp)" />
                      <q-btn flat round color="primary" icon="edit" size="sm" @click.stop="openDialog(props.row)" />
                    </div>
                  </q-item-section>
                </q-item>
                
                <q-separator />
                
                <q-card-section class="q-py-xs bg-grey-1">
                  <div class="text-caption text-grey-8 flex items-center no-wrap">
                    <q-icon name="place" size="14px" class="q-mr-xs" />
                    <span class="truncate">{{ props.row.alamat || 'Alamat tidak tersedia' }}</span>
                  </div>
                  <div class="text-caption text-grey-7 flex items-center no-wrap" v-if="props.row.kolektor">
                    <q-icon name="badge" size="14px" class="q-mr-xs" />
                    <span class="truncate">K: {{ props.row.kolektor }} | M: {{ props.row.marketer || '-' }}</span>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </template>

          <!-- DESKTOP VIEW (Table Body) -->
          <template v-slot:body-cell-actions="props">
            <q-td :props="props" class="q-gutter-xs" align="center">
              <q-btn flat round color="positive" icon="fab fa-whatsapp" size="sm" @click="openWA(props.row.no_hp)">
                <q-tooltip>Hubungi WhatsApp</q-tooltip>
              </q-btn>
              <q-btn flat round color="primary" icon="edit" size="sm" @click="openDialog(props.row)">
                <q-tooltip>Edit Data</q-tooltip>
              </q-btn>
              <q-btn flat round color="negative" icon="delete" size="sm" @click="confirmDelete(props.row)">
                <q-tooltip>Hapus Donatur</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </div>
    </div>

    <!-- Responsive Dialog -->
    <q-dialog v-model="dialog.show" :maximized="$q.screen.lt.md" transition-show="slide-up" transition-hide="slide-down">
      <q-card :style="$q.screen.gt.sm ? 'width: 800px; max-width: 90vw;' : ''" class="rounded-lg">
        <q-card-section class="row items-center q-pb-none" :class="$q.screen.lt.md ? 'bg-primary text-white' : ''">
          <div class="text-h6">{{ dialog.editMode ? 'Edit' : 'Tambah' }} Donatur</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pa-md scroll" style="max-height: 90vh">
          <q-form @submit="save" class="q-gutter-y-sm">
            <div class="row q-col-gutter-sm">
              <!-- Baris Utama -->
              <q-input v-model="form.nama" label="Nama Lengkap" filled class="col-12 col-sm-8" :rules="[val => !!val || 'Nama wajib diisi']" dense />
              <q-select v-model="form.sapaan" :options="['Bpk', 'Ibu', 'Sdr', 'Sdri', 'Mr', 'Mrs']" label="Sapaan" filled class="col-12 col-sm-4" dense />
              
              <!-- Kontak -->
              <q-input v-model="form.no_hp" label="No. Handphone (WA)" filled class="col-12 col-sm-6" hint="Contoh: 0812..." dense />
              <q-input v-model="form.email" label="Email" filled class="col-12 col-sm-6" type="email" dense />
              
              <!-- Profil -->
              <q-select v-model="form.kelamin" :options="[{label: 'Laki-laki', value: 'L'}, {label: 'Perempuan', value: 'P'}]" map-options emit-value label="Jenis Kelamin" filled class="col-12 col-sm-4" dense />
              <q-input v-model="form.tgl_lahir" label="Tanggal Lahir" filled type="date" class="col-12 col-sm-4" stack-label dense />
              <q-select v-model="form.kategori" :options="['Retail', 'Corporate', 'Komunitas']" label="Kategori" filled class="col-12 col-sm-4" dense />
              
              <!-- Administrasi -->
              <q-select v-model="form.d_tipe" :options="['INSIDENTIL', 'RUTIN']" label="Tipe Donatur" filled class="col-12 col-sm-4" dense />
              <q-input v-model="form.tgl_reg" label="Tgl Registrasi" filled type="date" class="col-12 col-sm-4" stack-label dense />
              <q-select v-model="form.status" :options="['Aktif', 'Tidak Aktif']" label="Status" filled class="col-12 col-sm-4" dense />

              <!-- Info Tambahan -->
              <q-input v-model="form.source" label="Sumber Data / Media" filled class="col-12 col-sm-6" dense />
              <q-input v-model="form.npwp" label="NPWP" filled class="col-12 col-sm-3" dense />
              <q-input v-model="form.npwz" label="NPWZ" filled class="col-12 col-sm-3" dense />

              <q-input v-model="form.alamat" label="Alamat Lengkap" filled autogrow type="textarea" class="col-12" dense />
              
              <q-select 
                v-model="form.office" 
                :options="offices" 
                option-label="kantor_label" 
                option-value="officeid" 
                emit-value 
                map-options 
                label="Kantor Afiliasi" 
                filled 
                class="col-12" 
                dense
              />

              <q-input v-model="form.kolektor" label="Kolektor Penanggung Jawab" filled class="col-12 col-sm-6" dense />
              <q-input v-model="form.marketer" label="Marketer Ref" filled class="col-12 col-sm-6" dense />
            </div>

            <div class="row justify-end q-mt-lg q-gutter-sm no-wrap">
              <q-btn label="Batal" color="grey-7" flat v-close-popup class="col-grow" />
              <q-btn :label="dialog.editMode ? 'Update' : 'Simpan'" type="submit" color="primary" unelevated :loading="saving" class="col-grow rounded-borders" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>


    <!-- Delete Confirmation -->
    <q-dialog v-model="deleteConfirm.show">
      <q-card style="border-radius: 12px">
        <q-card-section class="row items-center">
          <q-avatar icon="warning" color="negative" text-color="white" size="md" />
          <div class="text-h6 q-ml-md">Hapus Donatur?</div>
        </q-card-section>
        <q-card-section>
          Anda akan menghapus <strong>{{ deleteConfirm.data?.nama }}</strong> secara permanen.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Batal" color="grey-7" v-close-popup />
          <q-btn unelevated label="Hapus" color="negative" @click="doDelete" :loading="deleting" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted, reactive, watch } from 'vue'
import { api } from 'src/api'
import { useQuasar, date } from 'quasar'
import { useAuthStore } from 'src/stores/auth'

const auth = useAuthStore()

const $q = useQuasar()
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const filter = ref('')
const rows = ref([])
const offices = ref([])
const officeFilter = ref('')
watch(officeFilter, () => {
  pagination.value.page = 1
  fetchData()
})

const pagination = ref({
  sortBy: 'donatur_id',
  descending: true,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0
})

const columns = [
  { name: 'donatur_id', label: 'ID', field: 'donatur_id', align: 'left', sortable: true },
  { name: 'nama', label: 'Nama Lengkap', field: 'nama', align: 'left', sortable: true },
  { name: 'hp', label: 'No. HP', field: 'no_hp', align: 'left' },
  { name: 'alamat', label: 'Alamat', field: 'alamat', align: 'left', sortable: true, classes: 'ellipsis', style: 'max-width: 200px' },
  { name: 'kolektor', label: 'Kolektor', field: 'kolektor', align: 'left', sortable: true },
  { name: 'marketer', label: 'Marketer', field: 'marketer', align: 'left', sortable: true },
  { name: 'actions', label: 'Aksi', align: 'center' }
]

const form = reactive({
  donatur_id: null,
  nama: '',
  no_hp: '',
  email: '',
  alamat: '',
  kategori: 'Retail',
  sapaan: '',
  source: '',
  kelamin: 'L',
  tgl_lahir: '',
  d_tipe: 'INSIDENTIL',
  status: 'Aktif',
  tgl_reg: date.formatDate(new Date(), 'YYYY-MM-DD'),
  npwp: '',
  npwz: '',
  office: '',
  kolektor: '',
  marketer: ''
})

const dialog = reactive({
  show: false,
  editMode: false
})

const deleteConfirm = reactive({
  show: false,
  data: null
})

const fetchData = async (props) => {
  const { page, rowsPerPage, sortBy, descending } = props?.pagination || pagination.value
  loading.value = true
  try {
    const params = {
      page,
      limit: rowsPerPage,
      search: filter.value,
      office: officeFilter.value || ''
    }
    
    const [resDon, resOff] = await Promise.all([
      api.get('/master/donatur', { params }),
      api.get('/master/office')
    ])
    
    rows.value = resDon.data.data
    const sorted = [...resOff.data].sort((a, b) => a.officeid.localeCompare(b.officeid))
    offices.value = sorted.map(o => ({
      ...o,
      kantor_label: `${o.officeid} - ${o.kantor}`
    }))
    
    // Update local pagination state
    pagination.value.page = resDon.data.pagination.page
    pagination.value.rowsPerPage = resDon.data.pagination.limit
    pagination.value.rowsNumber = resDon.data.pagination.totalCount
  } catch (err) {
    $q.notify({ color: 'negative', message: 'Gagal mengambil data' })
  } finally {
    loading.value = false
  }
}

const openDialog = (data = null) => {
  if (data) {
    // Mapping from DB field 'tipe_donatur' back to form 'kategori'
    const editData = { ...data, kategori: data.tipe_donatur || 'Retail' }
    Object.assign(form, editData)
    dialog.editMode = true
  } else {
    Object.assign(form, { 
      donatur_id: null, nama: '', no_hp: '', email: '', alamat: '', 
      kategori: 'Retail', sapaan: '', source: '', kelamin: 'L', 
      tgl_lahir: '', d_tipe: 'INSIDENTIL', status: 'Aktif',
      tgl_reg: date.formatDate(new Date(), 'YYYY-MM-DD'),
      npwp: '', npwz: '', 
      office: auth.user?.office || '',
      kolektor: '', marketer: '' 
    })
    dialog.editMode = false
  }
  dialog.show = true
}


const save = async () => {
  saving.value = true
  try {
    if (dialog.editMode) {
      await api.put(`/master/donatur/${form.donatur_id}`, form)
      $q.notify({ color: 'positive', message: 'Data donatur diperbarui' })
    } else {
      await api.post('/master/donatur', form)
      $q.notify({ color: 'positive', message: 'Donatur baru ditambahkan' })
    }
    dialog.show = false
    fetchData()
  } catch (err) {
    $q.notify({ color: 'negative', message: err.response?.data?.message || 'Terjadi kesalahan sistem' })
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
    await api.delete(`/master/donatur/${deleteConfirm.data.donatur_id}`)
    $q.notify({ color: 'positive', icon: 'delete', message: 'Donatur berhasil dihapus' })
    deleteConfirm.show = false
    fetchData()
  } catch (err) {
    $q.notify({ color: 'negative', message: 'Gagal menghapus data' })
  } finally {
    deleting.value = false
  }
}

const openWA = (hp) => {
  if (!hp) return
  let cleanHp = hp.replace(/[^0-9]/g, '')
  if (cleanHp.startsWith('0')) cleanHp = '62' + cleanHp.slice(1)
  window.open(`https://wa.me/${cleanHp}`, '_blank')
}

onMounted(fetchData)
</script>

<style scoped>
.rounded-lg { border-radius: 12px; }
.mobile-donatur-card {
  border-radius: 12px;
  background: white;
  margin-bottom: 8px;
}
.primary-faded {
  background-color: rgba(var(--q-primary), 0.1);
}
.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.donatur-table :deep(.q-table__grid-content) {
  padding: 8px;
}
</style>
