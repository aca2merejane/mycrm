<template>
  <q-page padding class="bg-grey-1">
    <div class="row q-col-gutter-md justify-center">
      <!-- Header Section -->
      <div class="col-12 col-md-11 flex justify-between items-center q-mb-md">
        <div>
          <h1 class="text-h5 q-my-none text-weight-bold text-primary">Produk & Program</h1>
          <div class="text-caption text-grey-7">Kelola program donasi, qurban, dan sumber dana</div>
        </div>
        <q-btn
          v-if="isCentralAdmin"
          color="primary"
          icon="add"
          label="Tambah Produk"
          @click="openDialog()"
          unelevated
          class="rounded-borders"
        />
      </div>

      <!-- Warning Banner for Non-Central Admin -->
      <div v-if="!isCentralAdmin" class="col-12 col-md-11">
        <q-banner class="bg-warning text-dark rounded-borders q-pa-md shadow-1">
          <template v-slot:avatar>
            <q-icon name="warning" color="amber-10" size="md" />
          </template>
          <strong>Akses Terbatas:</strong> Hanya Administrator Kantor Pusat (Kode Kantor 0) yang dapat menambah, mengubah, atau menghapus produk/program. Akun Anda saat ini terdaftar pada kode kantor <strong>{{ authStore.user?.office }}</strong>.
        </q-banner>
      </div>

      <!-- Search & Filter Card -->
      <div class="col-12 col-md-11">
        <q-card flat bordered class="bg-white q-pa-sm rounded-lg">
          <div class="row q-col-gutter-sm items-center">
            <div class="col-12 col-sm-8">
              <q-input v-model="filter" dense filled borderless placeholder="Cari nama produk atau ID..." clearable>
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

      <!-- Product Cards List -->
      <div class="col-12 col-md-11">
        <div class="row q-col-gutter-md">
          <div v-for="row in filteredRows" :key="row.produk_id" class="col-12 col-sm-6 col-lg-4">
            <q-card flat bordered class="product-card hover-shadow transition-all">
              <q-card-section class="q-pb-none">
                <div class="row items-start justify-between no-wrap">
                  <div class="col">
                    <div class="text-overline text-primary">{{ row.produk_id }}</div>
                    <div class="text-h6 text-weight-bolder leading-tight q-mt-xs">{{ row.produk }}</div>
                  </div>
                  <q-chip 
                    :color="row.aktif === 'Y' ? 'positive' : 'grey-7'" 
                    text-color="white" 
                    dense size="sm" 
                    class="text-weight-bold"
                  >
                    {{ row.aktif === 'Y' ? 'AKTIF' : 'NON-AKTIF' }}
                  </q-chip>
                </div>
              </q-card-section>

              <q-card-section class="q-py-md">
                <div class="row q-col-gutter-sm">
                  <div class="col-6">
                    <div class="text-caption text-grey-7">Jenis Dana</div>
                    <q-chip outline color="primary" dense size="sm" icon="savings">
                      {{ row.dana }}
                    </q-chip>
                  </div>
                  <div class="col-6 text-right">
                    <div class="text-caption text-grey-7">Hak Amil</div>
                    <div class="text-subtitle2 text-weight-bold">{{ row.hak_amil }}%</div>
                  </div>
                </div>
              </q-card-section>

              <q-card-section class="q-py-xs bg-indigo-1">
                <div class="row items-center no-wrap">
                  <q-icon name="account_tree" color="indigo" size="18px" class="q-mr-sm" />
                  <div class="text-caption text-indigo-9 text-weight-bold truncate">
                    AKUN: {{ getAccountDisplay(row.akun) }}
                  </div>
                </div>
              </q-card-section>

              <q-separator />

              <q-card-actions v-if="isCentralAdmin" align="right" class="q-pa-sm">
                <q-btn flat round color="primary" icon="edit" size="sm" @click="openDialog(row)">
                  <q-tooltip>Edit Produk</q-tooltip>
                </q-btn>
                <q-btn flat round color="negative" icon="delete" size="sm" @click="confirmDelete(row)">
                  <q-tooltip>Hapus Produk</q-tooltip>
                </q-btn>
              </q-card-actions>
            </q-card>
          </div>

          <!-- Empty State -->
          <div v-if="filteredRows.length === 0 && !loading" class="col-12 text-center q-pa-xl">
            <q-icon name="inventory_2" size="84px" color="grey-4" />
            <div class="text-h6 text-grey-5 q-mt-md">Tidak ada data produk</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Dialog Form -->
    <q-dialog v-model="dialog.show" persistent maximized v-if="$q.screen.lt.md">
      <q-card class="column no-wrap">
        <q-card-section class="row items-center bg-primary text-white">
          <div class="text-h6">{{ dialog.editMode ? 'Edit' : 'Tambah' }} Produk</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="col scroll q-pa-md">
          <q-form @submit="save" class="q-gutter-md">
            <!-- Form content (same as desktop but optimized for mobile) -->
            <q-input v-model="form.produk_id" label="ID Produk" :readonly="dialog.editMode" filled :rules="[val => !!val || 'ID wajib diisi']" />
            <q-input v-model="form.produk" label="Nama Produk" filled :rules="[val => !!val || 'Nama wajib diisi']" />
            <q-select v-model="form.dana" :options="['ZAKAT', 'INFAK', 'INFAK_KHUSUS','QURBAN', 'DSKL', 'WAKAF']" label="Sumber Dana" filled />
            <q-input v-model.number="form.hak_amil" type="number" step="0.001" label="Hak Amil (%)" filled />
            
            <q-separator q-my-md />
            <div class="text-subtitle2 text-grey-7">Pemetaan Akun</div>
            <q-select v-model="form.akun" :options="coaList" option-label="label" option-value="coa" emit-value map-options label="Akun Penerimaan" filled use-input @filter="filterCOA">
              <template v-slot:option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section>
                    <q-item-label>{{ scope.opt.coa }}</q-item-label>
                    <q-item-label caption>{{ scope.opt.perkiraan }}</q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
            <q-select v-model="form.akun_amil" :options="coaList" option-label="label" option-value="coa" emit-value map-options label="Akun Hak Amil" filled use-input @filter="filterCOA">
              <template v-slot:option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section>
                    <q-item-label>{{ scope.opt.coa }}</q-item-label>
                    <q-item-label caption>{{ scope.opt.perkiraan }}</q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
            <q-select v-model="form.akun_salur" :options="coaList" option-label="label" option-value="coa" emit-value map-options label="Akun Penyaluran" filled use-input @filter="filterCOA">
              <template v-slot:option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section>
                    <q-item-label>{{ scope.opt.coa }}</q-item-label>
                    <q-item-label caption>{{ scope.opt.perkiraan }}</q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
            
            <q-select v-model="form.aktif" :options="[{label: 'Aktif', value: 'Y'}, {label: 'Non-Aktif', value: 'N'}]" emit-value map-options label="Status" filled />

            <div class="q-mt-lg">
              <q-btn label="Simpan Produk" type="submit" color="primary" class="full-width rounded-borders" size="lg" unelevated :loading="saving" />
              <q-btn label="Batal" color="grey-7" flat v-close-popup class="full-width q-mt-sm" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="dialog.show" persistent v-else>
      <q-card style="width: 700px; max-width: 95vw; border-radius: 16px">
        <q-card-section class="row items-center bg-primary text-white">
          <div class="text-h6">{{ dialog.editMode ? 'Edit' : 'Tambah' }} Produk</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pa-lg">
          <q-form @submit="save" class="q-gutter-md">
            <div class="row q-col-gutter-sm">
              <q-input v-model="form.produk_id" label="ID Produk" :readonly="dialog.editMode" filled class="col-4" :rules="[val => !!val || 'ID wajib diisi']" />
              <q-select v-model="form.dana" :options="['ZAKAT', 'INFAK', 'INFAK_KHUSUS','QURBAN', 'DSKL', 'WAKAF']" label="Sumber Dana" filled class="col-4" />
              <q-input v-model="form.produk" label="Nama Produk/Program" filled class="col-4" :rules="[val => !!val || 'Nama wajib diisi']" />
            </div>

            <div class="row q-col-gutter-sm">
              <q-input v-model.number="form.price" type="number" label="Harga Tetap (Opsi)" filled class="col-6" />
              <q-input v-model.number="form.hak_amil" type="number" step="0.001" label="Hak Amil (%)" filled class="col-6" />
            </div>

            <div class="text-subtitle2 text-grey-7 q-mt-md">Link Akun Akuntansi (COA)</div>
            <div class="row q-col-gutter-sm">
              <q-select v-model="form.akun" :options="coaList" option-label="label" option-value="coa" emit-value map-options label="Akun Penerimaan (Utama)" filled class="col-12" use-input @filter="filterCOA">
                <template v-slot:option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section>
                      <q-item-label>{{ scope.opt.coa }}</q-item-label>
                      <q-item-label caption>{{ scope.opt.perkiraan }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
              <q-select v-model="form.akun_amil" :options="coaList" option-label="label" option-value="coa" emit-value map-options label="Akun Hak Amil" filled class="col-6" use-input @filter="filterCOA">
                <template v-slot:option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section>
                      <q-item-label>{{ scope.opt.coa }}</q-item-label>
                      <q-item-label caption>{{ scope.opt.perkiraan }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
              <q-select v-model="form.akun_salur" :options="coaList" option-label="label" option-value="coa" emit-value map-options label="Akun Penyaluran" filled class="col-6" use-input @filter="filterCOA">
                <template v-slot:option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section>
                      <q-item-label>{{ scope.opt.coa }}</q-item-label>
                      <q-item-label caption>{{ scope.opt.perkiraan }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>

            <q-select v-model="form.aktif" :options="[{label: 'Aktif', value: 'Y'}, {label: 'Non-Aktif', value: 'N'}]" emit-value map-options label="Status Layanan" filled />

            <div class="row justify-end q-mt-lg q-gutter-sm">
              <q-btn label="Batal" color="grey" flat v-close-popup />
              <q-btn :label="dialog.editMode ? 'Update Produk' : 'Simpan Produk'" type="submit" color="primary" :loading="saving" unelevated class="rounded-borders" />
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
          <div class="text-h6 q-ml-md">Hapus Produk</div>
        </q-card-section>

        <q-card-section class="q-pt-md">
          Apa Anda yakin ingin menghapus <strong>{{ deleteConfirm.data?.produk }}</strong>?
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
import { useAuthStore } from 'src/stores/auth'

const $q = useQuasar()
const authStore = useAuthStore()
const isCentralAdmin = computed(() => {
  return authStore.user?.office === '0' || authStore.user?.office === 0
})
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const filter = ref('')
const rows = ref([])
const coaListOriginal = ref([])
const coaList = ref([])

const filteredRows = computed(() => {
  if (!filter.value) return rows.value
  const term = filter.value.toLowerCase()
  return rows.value.filter(r => 
    r.produk?.toLowerCase().includes(term) || 
    r.produk_id?.toLowerCase().includes(term) || 
    r.dana?.toLowerCase().includes(term)
  )
})

const form = reactive({
  produk_id: '',
  dana: 'ZAKAT',
  produk: '',
  price: 0,
  aktif: 'Y',
  akun: '',
  akun_amil: '',
  akun_salur: '',
  hak_amil: 0
})

const dialog = reactive({
  show: false,
  editMode: false
})

const deleteConfirm = reactive({
  show: false,
  data: null
})

const getAccountDisplay = (coa) => {
  if (!coa) return 'Belum diatur'
  const acc = coaListOriginal.value.find(a => a.coa === coa)
  return acc ? `${acc.coa} - ${acc.perkiraan}` : coa
}

const fetchData = async () => {
  loading.value = true
  try {
    const [resProd, resCoa] = await Promise.all([
      api.get('/master/product'),
      api.get('/master/coa')
    ])
    rows.value = resProd.data
    const coaData = resCoa.data.map(c => ({
      ...c,
      label: `${c.coa} - ${c.perkiraan}`
    }))
    coaListOriginal.value = coaData
    coaList.value = coaData
  } catch (err) {
    $q.notify({ color: 'negative', message: 'Gagal mengambil data' })
  } finally {
    loading.value = false
  }
}

const filterCOA = (val, update) => {
  if (val === '') {
    update(() => { coaList.value = coaListOriginal.value })
    return
  }
  update(() => {
    const needle = val.toLowerCase()
    coaList.value = coaListOriginal.value.filter(v => v.perkiraan.toLowerCase().indexOf(needle) > -1 || v.coa.indexOf(needle) > -1)
  })
}

const openDialog = (data = null) => {
  if (!isCentralAdmin.value) return
  if (data) {
    Object.assign(form, data)
    dialog.editMode = true
  } else {
    Object.assign(form, {
      produk_id: '', dana: 'ZAKAT', produk: '', price: 0,
      aktif: 'Y', akun: '', akun_amil: '', akun_salur: '', hak_amil: 0
    })
    dialog.editMode = false
  }
  dialog.show = true
}

const save = async () => {
  if (!isCentralAdmin.value) {
    $q.notify({ color: 'negative', message: 'Akses ditolak: Hanya admin kantor pusat yang dapat menyimpan produk' })
    return
  }
  saving.value = true
  try {
    if (dialog.editMode) {
      await api.put(`/master/product/${form.produk_id}`, form)
      $q.notify({ color: 'positive', message: 'Produk berhasil diupdate' })
    } else {
      await api.post('/master/product', form)
      $q.notify({ color: 'positive', message: 'Produk berhasil disimpan' })
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
  if (!isCentralAdmin.value) {
    $q.notify({ color: 'negative', message: 'Akses ditolak: Hanya admin kantor pusat yang dapat menghapus produk' })
    return
  }
  deleting.value = true
  try {
    await api.delete(`/master/product/${deleteConfirm.data.produk_id}`)
    $q.notify({ color: 'positive', message: 'Produk berhasil dihapus' })
    deleteConfirm.show = false
    fetchData()
  } catch (err) {
    $q.notify({ color: 'negative', message: 'Gagal menghapus produk' })
  } finally {
    deleting.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped>
.product-card {
  border-radius: 16px;
  background: white;
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
.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
