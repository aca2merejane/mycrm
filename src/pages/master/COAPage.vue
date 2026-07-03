<template>
  <q-page padding class="bg-grey-1">
    <div class="row q-col-gutter-md justify-center">
      <!-- Header Section -->
      <div class="col-12 flex justify-between items-center q-mb-md">
        <div>
          <h1 class="text-h5 q-my-none text-weight-bold text-primary">Chart of Accounts</h1>
          <div class="text-caption text-grey-7">Kelola bagan akun untuk pelaporan keuangan</div>
        </div>
        <q-btn
          color="primary"
          icon="add"
          label="Tambah Akun"
          @click="openDialog()"
          unelevated
          class="rounded-borders"
        />
      </div>

      <!-- Main Table / Grid -->
      <div class="col-12">
        <q-table
          :rows="rows"
          :columns="columns"
          row-key="coa"
          :filter="filter"
          :loading="loading"
          flat
          bordered
          :grid="$q.screen.lt.md"
          :pagination="{ rowsPerPage: 15 }"
          class="coa-table bg-white rounded-lg shadow-1"
        >
          <!-- Custom Header for Search -->
          <template v-slot:top-right>
            <q-input v-model="filter" dense filled borderless placeholder="Cari akun..." class="q-ml-md" style="min-width: 250px">
              <template v-slot:prepend>
                <q-icon name="search" color="primary" />
              </template>
            </q-input>
            <q-btn flat round color="grey-7" icon="refresh" class="q-ml-sm" @click="fetchData" />
          </template>

          <!-- Grid Slot for Mobile -->
          <template v-slot:item="props">
            <div class="q-pa-xs col-xs-12 col-sm-6">
              <q-card flat bordered class="coa-card hover-shadow transition-all">
                <q-card-section>
                  <div class="row items-start justify-between no-wrap">
                    <div class="col">
                      <div class="text-overline text-primary">{{ props.row.coa }}</div>
                      <div class="text-h6 text-weight-bolder leading-tight q-mt-xs">{{ props.row.perkiraan }}</div>
                    </div>
                    <q-chip 
                      :color="props.row.defaul === 'Debet' ? 'blue' : 'orange'" 
                      text-color="white" 
                      outline dense size="sm"
                    >
                      {{ props.row.defaul === 'Debet' ? 'D' : 'K' }}
                    </q-chip>
                  </div>
                </q-card-section>

                <q-separator />

                <q-card-actions align="right" class="q-pa-xs">
                  <q-btn flat round color="primary" icon="edit" size="sm" @click="openDialog(props.row)" />
                  <q-btn flat round color="negative" icon="delete" size="sm" @click="confirmDelete(props.row)" />
                </q-card-actions>
              </q-card>
            </div>
          </template>

          <!-- Column Slot for Actions in Desktop Table -->
          <template v-slot:body-cell-actions="props">
            <q-td :props="props" class="q-gutter-xs" align="center">
              <q-btn flat round color="primary" icon="edit" size="sm" @click="openDialog(props.row)">
                <q-tooltip>Edit</q-tooltip>
              </q-btn>
              <q-btn flat round color="negative" icon="delete" size="sm" @click="confirmDelete(props.row)">
                <q-tooltip>Hapus</q-tooltip>
              </q-btn>
            </q-td>
          </template>
          
          <template v-slot:body-cell-defaul="props">
            <q-td :props="props" align="center">
              <q-badge :color="props.value === 'Debet' ? 'blue' : 'orange'">
                {{ props.value === 'Debet' ? 'D' : 'K' }}
              </q-badge>
            </q-td>
          </template>
        </q-table>
      </div>
    </div>

    <!-- Dialog Form -->
    <q-dialog v-model="dialog.show" persistent>
      <q-card style="width: 450px; max-width: 95vw; border-radius: 16px">
        <q-card-section class="row items-center bg-primary text-white">
          <div class="text-h6">{{ dialog.editMode ? 'Edit' : 'Tambah' }} Akun</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pa-lg">
          <q-form @submit="save" class="q-gutter-md">
            <q-input
              v-model="form.coa"
              label="Kode Akun (COA)"
              :readonly="dialog.editMode"
              filled
              hint="Contoh: 111.01.001"
              :rules="[val => !!val || 'Kode Akun wajib diisi']"
            />
            <q-input v-model="form.perkiraan" label="Nama Perkiraan" filled :rules="[val => !!val || 'Nama wajib diisi']" />
            
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input v-model="form.group" label="Group" filled />
              </div>
              <div class="col-6">
                <q-input v-model="form.kelompok" label="Kelompok" filled />
              </div>
            </div>

            <q-select
              v-model="form.defaul"
              :options="['Debet', 'Kredit']"
              label="Default Saldo"
              filled
            />

            <div class="row justify-end q-mt-lg q-gutter-sm">
              <q-btn label="Batal" color="grey" flat v-close-popup />
              <q-btn :label="dialog.editMode ? 'Update Akun' : 'Simpan Akun'" type="submit" color="primary" :loading="saving" unelevated class="rounded-borders" />
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
          <div class="text-h6 q-ml-md">Hapus Akun</div>
        </q-card-section>

        <q-card-section class="q-pt-md">
          Apa Anda yakin ingin menghapus akun <strong>{{ deleteConfirm.data?.coa }} - {{ deleteConfirm.data?.perkiraan }}</strong>?
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

const filteredRows = computed(() => {
  if (!filter.value) return rows.value
  const term = filter.value.toLowerCase()
  return rows.value.filter(r => 
    r.coa?.toLowerCase().includes(term) || 
    r.perkiraan?.toLowerCase().includes(term) ||
    r.group?.toLowerCase().includes(term)
  )
})

const columns = [
  { name: 'coa', label: 'Kode COA', field: 'coa', align: 'left', sortable: true },
  { name: 'perkiraan', label: 'Nama Perkiraan', field: 'perkiraan', align: 'left', sortable: true },
  { name: 'group', label: 'Group', field: 'group', align: 'left', sortable: true },
  { name: 'kelompok', label: 'Kelompok', field: 'kelompok', align: 'left', sortable: true },
  { name: 'defaul', label: 'D/K', field: 'defaul', align: 'center' },
  { name: 'actions', label: 'Aksi', align: 'center' }
]

const form = reactive({
  coa: '',
  perkiraan: '',
  group: '',
  kelompok: '',
  defaul: 'Debet'
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
    const res = await api.get('/master/coa')
    rows.value = res.data
  } catch (err) {
    $q.notify({ color: 'negative', message: 'Gagal mengambil data COA' })
  } finally {
    loading.value = false
  }
}

const openDialog = (data = null) => {
  if (data) {
    Object.assign(form, data)
    dialog.editMode = true
  } else {
    Object.assign(form, { coa: '', perkiraan: '', group: '', kelompok: '', defaul: 'Debet' })
    dialog.editMode = false
  }
  dialog.show = true
}

const save = async () => {
  saving.value = true
  try {
    if (dialog.editMode) {
      await api.put(`/master/coa/${form.coa}`, form)
      $q.notify({ color: 'positive', message: 'Akun berhasil diupdate' })
    } else {
      await api.post('/master/coa', form)
      $q.notify({ color: 'positive', message: 'Akun berhasil disimpan' })
    }
    dialog.show = false
    fetchData()
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
    await api.delete(`/master/coa/${deleteConfirm.data.coa}`)
    $q.notify({ color: 'positive', message: 'Akun berhasil dihapus' })
    deleteConfirm.show = false
    fetchData()
  } catch (err) {
    $q.notify({ color: 'negative', message: 'Gagal menghapus akun' })
  } finally {
    deleting.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped>
.rounded-lg { border-radius: 12px; }
.coa-card { border-radius: 12px; }
.hover-shadow:hover {
  box-shadow: 0 4px 15px rgba(0,0,0,0.08) !important;
}
.transition-all { transition: all 0.3s ease; }
</style>
