<template>
  <q-page padding>
    <div class="row q-col-gutter-md justify-center">
      <div class="col-12 col-md-10">
        <!-- Header -->
        <div class="flex justify-between items-center q-mb-lg">
          <div>
            <h1 class="text-h5 q-my-none text-weight-bold text-primary">Input Donasi Baru</h1>
            <div class="text-caption text-grey-7">Silakan lengkapi data donasi di bawah ini</div>
          </div>
          <q-btn flat color="grey-7" icon="arrow_back" label="Kembali" to="/transactions" />
        </div>

        <q-form @submit="onSubmit" class="row q-col-gutter-lg">
          <!-- Left Column: Donor & Payment -->
          <div class="col-12 col-md-7">
            <q-card flat bordered class="q-pa-md bg-white shadow-1">
              <div class="text-subtitle1 text-weight-bold q-mb-md flex items-center">
                <q-icon name="person" color="primary" class="q-mr-sm" />
                Informasi Donatur
              </div>

              <div class="row q-col-gutter-sm">
                <div class="col-12">
                  <q-select
                    v-model="selectedDonor"
                    use-input
                    input-debounce="300"
                    label="Cari Donatur (Nama/HP)"
                    :options="donorOptions"
                    @filter="filterDonors"
                    outlined
                    dense
                    lazy-rules
                    :rules="[val => !!val || 'Donatur harus dipilih']"
                  >
                    <template v-slot:no-option>
                      <q-item>
                        <q-item-section class="text-grey">
                          Tidak ada hasil ditemukan
                        </q-item-section>
                      </q-item>
                    </template>
                    <template v-slot:option="scope">
                      <q-item v-bind="scope.itemProps">
                        <q-item-section>
                          <q-item-label>{{ scope.opt.label }}</q-item-label>
                          <q-item-label caption>{{ scope.opt.sublabel }}</q-item-label>
                        </q-item-section>
                      </q-item>
                    </template>
                  </q-select>
                </div>

                <div class="col-12 col-sm-6">
                  <q-input
                    v-model="transactionDate"
                    label="Tanggal Donasi"
                    type="date"
                    outlined
                    dense
                  />
                </div>

                <div class="col-12 col-sm-6">
                   <q-select
                    v-model="paymentMethod"
                    label="Metode Pembayaran"
                    use-input
                    input-debounce="300"
                    :options="filteredPaymentOptions"
                    @filter="filterPaymentMethods"
                    option-label="label"
                    option-value="value"
                    outlined
                    dense
                    emit-value
                    map-options
                    lazy-rules
                    :rules="[val => !!val || 'Metode bayar harus dipilih']"
                  >
                    <template v-slot:option="scope">
                      <q-item v-bind="scope.itemProps">
                        <q-item-section>
                          <q-item-label>{{ scope.opt.cara_bayar }}</q-item-label>
                          <q-item-label caption>{{ scope.opt.tipe_bayar }}</q-item-label>
                        </q-item-section>
                      </q-item>
                    </template>
                  </q-select>
                </div>

                <div class="col-12">
                  <q-input
                    v-model="keterangan"
                    type="textarea"
                    label="Keterangan (Opsional)"
                    outlined
                    dense
                    rows="2"
                  />
                </div>

                <div class="col-12">
                  <div class="text-caption text-grey-7 q-mb-xs">Bukti Pembayaran (Image)</div>
                  <q-file
                    v-model="buktiFile"
                    :label="isTransfer ? 'Upload Bukti Pembayaran (Wajib)' : 'Upload Bukti (Opsional)'"
                    outlined
                    dense
                    accept="image/*"
                    max-file-size="5120000"
                    @rejected="onFileRejected"
                    :rules="isTransfer ? [val => !!val || 'Bukti transfer wajib diunggah'] : []"
                  >
                    <template v-slot:prepend>
                      <q-icon name="cloud_upload" :color="isTransfer ? 'negative' : 'primary'" />
                    </template>
                    <template v-slot:append v-if="buktiFile">
                      <q-icon name="close" @click.stop="buktiFile = null" class="cursor-pointer" />
                    </template>
                  </q-file>
                </div>
              </div>
            </q-card>

            <!-- Line Items -->
            <q-card flat bordered class="q-mt-md q-pa-md bg-white shadow-1">
              <div class="flex justify-between items-center q-mb-md">
                <div class="text-subtitle1 text-weight-bold flex items-center">
                  <q-icon name="shopping_cart" color="primary" class="q-mr-sm" />
                  Rincian Donasi
                </div>
                <q-btn flat color="primary" icon="add" label="Tambah Baris" @click="addItem" />
              </div>

              <div v-for="(item, index) in items" :key="index" class="row q-col-gutter-sm q-mb-md items-center">
                <div class="col-12 col-sm-4">
                  <q-select
                    v-model="item.produk_id"
                    use-input
                    input-debounce="300"
                    label="Program / Produk"
                    :options="item.filteredOptions || productOptions"
                    @filter="(val, update) => filterProducts(val, update, index)"
                    outlined
                    dense
                    emit-value
                    map-options
                    @update:model-value="(val) => onProductSelect(val, index)"
                  >
                    <template v-slot:option="scope">
                      <q-item v-bind="scope.itemProps">
                        <q-item-section>
                          <q-item-label>{{ scope.opt.dana }} - {{ scope.opt.produk }}</q-item-label>
                          <q-item-label caption v-if="scope.opt.price">
                            {{ formatCurrency(scope.opt.price) }}
                          </q-item-label>
                        </q-item-section>
                      </q-item>
                    </template>
                    <template v-slot:no-option>
                      <q-item>
                        <q-item-section class="text-grey">
                          Produk tidak ditemukan
                        </q-item-section>
                      </q-item>
                    </template>
                  </q-select>
                </div>
                <div class="col-6 col-sm-2">
                  <q-input
                    v-model.number="item.price"
                    label="Nominal"
                    type="number"
                    outlined
                    dense
                    @update:model-value="updateItemSubtotal(index)"
                  />
                </div>
                <div class="col-6 col-sm-1">
                  <q-input
                    v-model.number="item.qty"
                    label="Qty"
                    type="number"
                    outlined
                    dense
                    @update:model-value="updateItemSubtotal(index)"
                  />
                </div>
                <div class="col-10 col-sm-4">
                  <q-input
                    v-model="item.keterangan"
                    label="Keterangan Item"
                    outlined
                    dense
                    type="textarea"
                    autogrow
                    placeholder="Catatan khusus item"
                  />
                </div>
                <div class="col-2 col-sm-1 text-right">
                  <q-btn flat round color="negative" icon="delete" size="sm" @click="removeItem(index)" v-if="items.length > 1" />
                </div>
              </div>
            </q-card>
          </div>

          <!-- Right Column: Summary -->
          <div class="col-12 col-md-5">
            <q-card flat bordered class="bg-primary text-white q-pa-lg sticky-top">
              <div class="text-h6 q-mb-md">Ringkasan Penerimaan</div>
              
              <div class="q-gutter-y-sm">
                <div class="flex justify-between border-bottom q-pb-xs">
                  <span>Total Donatur</span>
                  <span class="text-weight-bold">1 Person</span>
                </div>
                <div class="flex justify-between border-bottom q-pb-xs">
                  <span>Total Produk</span>
                  <span class="text-weight-bold">{{ items.length }} Item(s)</span>
                </div>
                <q-separator dark class="q-my-md" />
                <div class="flex justify-between items-end">
                  <div class="text-subtitle1">Grand Total</div>
                  <div class="text-h4 text-weight-bolder">{{ formatCurrency(grandTotal) }}</div>
                </div>
              </div>

              <q-btn
                type="submit"
                color="white"
                text-color="primary"
                unelevated
                class="full-width q-mt-xl py-3"
                size="lg"
                label="Simpan Donasi"
                :loading="submitting"
              />
              
              <div class="q-mt-md text-center">
                <q-checkbox v-model="printReceipt" label="Cetak Kwitansi Otomatis" color="white" dark />
              </div>
            </q-card>
            
            <q-card flat bordered class="q-mt-sm q-pa-md bg-grey-2">
              <div class="text-caption text-grey-8">
                <q-icon name="info" color="info" /> 
                Gunakan fitur ini untuk penerimaan donasi skala kantor/cabang. Jurnal akuntansi akan otomatis terbentuk setelah data berhasil disimpan.
              </div>
            </q-card>
          </div>
        </q-form>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from 'src/api'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const router = useRouter()

const submitting = ref(false)
const printReceipt = ref(true)
const transactionDate = ref(new Date().toISOString().split('T')[0])
const selectedDonor = ref(null)
const paymentMethod = ref(null)
const keterangan = ref('')
const buktiFile = ref(null)
const items = ref([{ produk_id: null, price: 0, qty: 1, sub_total: 0, keterangan: '' }])

// Options
const donorOptions = ref([])
const productOptions = ref([])
const paymentOptions = ref([])
const filteredPaymentOptions = ref([])

const isTransfer = computed(() => {
  const selected = paymentOptions.value.find(p => p.value === paymentMethod.value)
  if (!selected) return false
  const tipe = (selected.tipe_bayar || '').toLowerCase()
  return tipe.includes('bank') || tipe.includes('transfer') || tipe.includes('qris') || tipe.includes('bsi')
})

const grandTotal = computed(() => {
  return items.value.reduce((sum, item) => sum + (item.price * item.qty), 0)
})
const fetchInitialData = async () => {
  try {
    const [productsRes, paymentsRes] = await Promise.all([
      api.get('/master/product'),
      api.get('/master/payment-method')
    ])
    
    productOptions.value = productsRes.data.map(p => ({
      label: `${p.dana || '-'} - ${p.produk}`,
      value: p.produk_id,
      produk: p.produk,
      dana: p.dana || '-',
      price: p.price || 0
    }))
    
    paymentOptions.value = paymentsRes.data.map(pm => ({
      label: `${pm.cara_bayar} (${pm.tipe_bayar})`,
      value: pm.bayar_id,
      cara_bayar: pm.cara_bayar,
      tipe_bayar: pm.tipe_bayar
    }))
    filteredPaymentOptions.value = paymentOptions.value
  } catch (error) {
    console.error('Failed to load form data:', error)
  }
}

const filterDonors = async (val, update, abort) => {
  if (val.length < 2) {
    abort()
    return
  }

  try {
    const response = await api.get('/master/donatur', {
      params: { search: val, limit: 10 }
    })
    
    update(() => {
      const donors = Array.isArray(response.data) ? response.data : (response.data?.data || [])
      donorOptions.value = donors.map(d => ({
        label: `${d.nama} (${d.no_hp || 'No HP'})`,
        value: d.donatur_id,
        sublabel: d.donatur_id
      }))
    })
  } catch (error) {
    console.error('Error searching donors:', error)
    abort()
  }
}

const filterPaymentMethods = (val, update) => {
  if (val === '') {
    update(() => {
      filteredPaymentOptions.value = paymentOptions.value
    })
    return
  }

  update(() => {
    const needle = val.toLowerCase()
    filteredPaymentOptions.value = paymentOptions.value.filter(v => 
      v.label.toLowerCase().indexOf(needle) > -1 || 
      v.tipe_bayar.toLowerCase().indexOf(needle) > -1
    )
  })
}

const filterProducts = (val, update, index) => {
  if (val === '') {
    update(() => {
      items.value[index].filteredOptions = productOptions.value
    })
    return
  }

  update(() => {
    const needle = val.toLowerCase()
    items.value[index].filteredOptions = productOptions.value.filter(v => 
      v.produk.toLowerCase().indexOf(needle) > -1 || 
      v.dana.toLowerCase().indexOf(needle) > -1
    )
  })
}

const addItem = () => {
  items.value.push({ produk_id: null, price: 0, qty: 1, sub_total: 0, keterangan: '' })
}

const removeItem = (index) => {
  items.value.splice(index, 1)
}

const onProductSelect = (val, index) => {
  const prod = productOptions.value.find(p => p.value === val)
  if (prod) {
    items.value[index].price = prod.price
  }
}

const updateItemSubtotal = (index) => {
  items.value[index].sub_total = items.value[index].price * items.value[index].qty
}

const onFileRejected = (rejectedEntries) => {
  $q.notify({
    type: 'negative',
    message: 'File tidak valid atau terlalu besar (max 5MB)'
  })
}

const onSubmit = async () => {
  if (items.value.some(i => !i.produk_id)) {
    $q.notify({ color: 'negative', message: 'Silakan pilih produk donasi' })
    return
  }

  submitting.value = true
  try {
    let buktiFilename = null
    
    // 1. Upload file if exists
    if (buktiFile.value) {
      const formData = new FormData()
      formData.append('bukti', buktiFile.value)
      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      buktiFilename = uploadRes.data.filename
    }

    // 2. Prepare transaction payload
    const payload = {
      donor_id: selectedDonor.value.value,
      payment_id: paymentMethod.value,
      tgl: transactionDate.value,
      keterangan: keterangan.value,
      bukti: buktiFilename,
      items: items.value
    }
    
    const response = await api.post('/transactions', payload)
    
    $q.notify({
      color: 'positive',
      icon: 'check_circle',
      message: 'Donasi berhasil disimpan!'
    })
    
    router.push('/transactions')
  } catch (error) {
    $q.notify({
      color: 'negative',
      message: error.response?.data?.message || 'Gagal menyimpan donasi.'
    })
  } finally {
    submitting.value = false
  }
}

const formatCurrency = (val) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(val)
}

onMounted(() => {
  fetchInitialData()
})
</script>

<style lang="scss" scoped>
.sticky-top {
  position: sticky;
  top: 20px;
}
.border-bottom {
  border-bottom: 0.5px solid rgba(255, 255, 255, 0.2);
}
.py-3 {
  padding-top: 16px;
  padding-bottom: 16px;
}
</style>
