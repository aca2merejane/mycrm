<template>
  <q-page padding class="bg-grey-1">
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card class="shadow-1">
          <q-card-section class="row items-center q-pb-none">
            <div class="col">
              <div class="text-h6 text-weight-bold">Pengaturan Sistem</div>
              <div class="text-subtitle2 text-grey-7">Kelola pengguna dan konfigurasi aplikasi</div>
            </div>
            <div class="col-auto">
              <q-btn color="bmh-tosca" icon="add" label="Tambah User" @click="openAddDialog" v-if="authStore.isAdmin" />
            </div>
          </q-card-section>

          <q-tabs v-model="tab" class="text-teal" align="left" narrow-indicator>
            <q-tab name="users" icon="people" label="User" />
            <q-tab name="groups" icon="groups" label="Group" />
            <q-tab name="general" icon="settings" label="Umum" />
            <q-tab name="notifications" icon="notifications_active" label="Notifikasi" v-if="authStore.isAdmin" />
          </q-tabs>

          <q-separator />

          <q-tab-panels v-model="tab" animated>
            <q-tab-panel name="users">
              <q-table
                flat
                :rows="users"
                :columns="columns"
                row-key="login"
                :loading="loading"
              >
                <template v-slot:body-cell-active="props">
                  <q-td :props="props">
                    <q-badge :color="props.value === 'Y' ? 'positive' : 'negative'">
                      {{ props.value === 'Y' ? 'Aktif' : 'Nonaktif' }}
                    </q-badge>
                  </q-td>
                </template>
                <template v-slot:body-cell-priv_admin="props">
                  <q-td :props="props">
                    <q-icon :name="props.value === 'Y' ? 'admin_panel_settings' : 'person'" 
                           :color="props.value === 'Y' ? 'primary' : 'grey-7'" size="sm" />
                  </q-td>
                </template>
                <template v-slot:body-cell-actions="props">
                  <q-td :props="props" class="q-gutter-x-sm text-center">
                    <q-btn flat round dense color="primary" icon="edit" @click="editUser(props.row)" />
                    <q-btn flat round dense color="orange" icon="lock_reset" @click="resetUserPassword(props.row)" />
                  </q-td>
                </template>
              </q-table>
            </q-tab-panel>

            <q-tab-panel name="groups">
              <div class="row justify-end q-mb-md">
                <q-btn color="bmh-tosca" icon="add" label="Tambah Group" @click="openGroupDialog" v-if="authStore.isAdmin" />
              </div>
              <q-table
                flat
                :rows="groups"
                :columns="groupColumns"
                row-key="group_id"
                :loading="loadingGroups"
              >
                <template v-slot:body-cell-actions="props">
                  <q-td :props="props" class="q-gutter-x-sm text-center">
                    <q-btn flat round dense color="primary" icon="edit" @click="editGroup(props.row)" />
                    <q-btn flat round dense color="negative" icon="delete" @click="deleteGroup(props.row)" />
                  </q-td>
                </template>
              </q-table>
            </q-tab-panel>


            <q-tab-panel name="general">
              <div class="text-h6">Konfigurasi Aplikasi</div>
              <p class="text-grey-7">Modul pengaturan umum sedang dalam pengembangan.</p>
            </q-tab-panel>

            <q-tab-panel name="notifications" v-if="authStore.isAdmin">
              <div class="row q-col-gutter-md">
                <div class="col-12 col-md-7">
                  <q-card flat bordered class="q-pa-md bg-white">
                    <div class="text-h6 q-mb-md">Kirim Pesan Siaran (Broadcast)</div>
                    <q-form @submit="sendBroadcast" class="q-gutter-md">
                      <q-input v-model="broadcast.title" label="Judul Notifikasi" outlined dense 
                        placeholder="Contoh: Informasi Penting" :rules="[val => !!val || 'Judul wajib diisi']" />
                      
                      <q-input v-model="broadcast.message" label="Isi Pesan" outlined dense type="textarea"
                        placeholder="Ketik pesan Anda di sini..." :rules="[val => !!val || 'Pesan wajib diisi']" />
                      
                      <q-input v-model="broadcast.url" label="Link Tujuan (Opsional)" outlined dense 
                        placeholder="Contoh: /reports atau https://..." />

                      <div class="row items-center q-mt-md">
                        <q-btn color="bmh-tosca" icon="send" label="Kirim Sekarang" type="submit" :loading="sendingBroadcast" />
                        <q-space />
                        <div class="text-caption text-grey-7">Pesan akan dikirim ke seluruh perangkat yang terdaftar.</div>
                      </div>
                    </q-form>
                  </q-card>
                </div>
                
                <div class="col-12 col-md-5">
                  <q-card flat bordered class="q-pa-md bg-white">
                    <div class="text-h6 q-mb-sm">Status Layanan</div>
                    <q-list dense>
                      <q-item>
                        <q-item-section avatar>
                          <q-icon name="check_circle" color="positive" />
                        </q-item-section>
                        <q-item-section>Push API Platform: Aktif</q-item-section>
                      </q-item>
                      <q-item>
                        <q-item-section avatar>
                          <q-icon name="info" color="blue" />
                        </q-item-section>
                        <q-item-section>Metode Pengiriman: VAPID (Private)</q-item-section>
                      </q-item>
                    </q-list>
                    <div class="text-body2 q-mt-md text-grey-9 bg-grey-2 q-pa-sm rounded-borders">
                      <q-icon name="lightbulb" color="orange" /> 
                      Tips: Gunakan fitur ini untuk memberikan info update sistem atau pengumuman penting kepada seluruh karyawan BMH.
                    </div>
                  </q-card>
                </div>
              </div>
            </q-tab-panel>
          </q-tab-panels>
        </q-card>
      </div>
    </div>

    <!-- Add/Edit User Dialog -->
    <q-dialog v-model="showUserDialog">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">{{ isEdit ? 'Edit User' : 'Tambah User Baru' }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-form @submit="saveUser" class="q-gutter-md">
            <q-input v-model="userData.login" label="Username (Login)" outlined dense :readonly="isEdit"
              :rules="[val => !!val || 'Username wajib diisi']" />
            
            <q-input v-if="!isEdit" v-model="userData.pswd" label="Password" outlined dense type="password"
              :rules="[val => !!val || 'Password wajib diisi']" />
            
            <q-input v-model="userData.name" label="Nama Lengkap" outlined dense
              :rules="[val => !!val || 'Nama wajib diisi']" />
            
            <q-input v-model="userData.email" label="Email" outlined dense type="email" />

            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-select v-model="userData.office" :options="offices" option-label="kantor" option-value="officeid"
                  emit-value map-options label="Kantor" outlined dense />
              </div>
              <div class="col-6">
                <q-select v-model="userData.active" :options="[{label: 'Aktif', value: 'Y'}, {label: 'Nonaktif', value: 'N'}]"
                  emit-value map-options label="Status" outlined dense />
              </div>
            </div>

            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-select v-model="userData.group_id" :options="groups" option-label="description" option-value="group_id"
                  emit-value map-options label="Group / Role" outlined dense />
              </div>
              <div class="col-6">
                <q-checkbox v-model="userData.priv_admin" true-value="Y" false-value="N" label="Akses Administrator" />
              </div>
            </div>

            <div class="row justify-end q-mt-md">
              <q-btn flat label="Batal" v-close-popup />
              <q-btn color="bmh-tosca" label="Simpan" type="submit" :loading="saving" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Reset Password Dialog -->
    <q-dialog v-model="showResetDialog">
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Reset Password: {{ selectedUser?.login }}</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-input v-model="newPassword" label="Password Baru" outlined dense type="password" 
            :rules="[val => !!val || 'Password baru wajib diisi']" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Batal" v-close-popup />
          <q-btn label="Update Password" color="orange" @click="confirmResetPassword" :loading="saving" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Group Dialog -->
    <q-dialog v-model="showGroupDialog">
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">{{ isEditGroup ? 'Edit Group' : 'Tambah Group' }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-form @submit="saveGroup" class="q-gutter-md">
            <q-input v-model="groupData.description" label="Deskripsi / Nama Group" outlined dense 
              :rules="[val => !!val || 'Deskripsi wajib diisi']" />

            <div class="row justify-end q-mt-md">
              <q-btn flat label="Batal" v-close-popup />
              <q-btn color="bmh-tosca" label="Simpan" type="submit" :loading="savingGroup" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from 'src/api'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'stores/auth'

const $q = useQuasar()
const authStore = useAuthStore()

const tab = ref('users')
const loading = ref(false)
const loadingGroups = ref(false)
const saving = ref(false)
const savingGroup = ref(false)
const sendingBroadcast = ref(false)
const users = ref([])
const groups = ref([])
const offices = ref([])
const broadcast = ref({
  title: '',
  message: '',
  url: '/'
})

const showUserDialog = ref(false)
const showGroupDialog = ref(false)
const isEdit = ref(false)
const isEditGroup = ref(false)

const userData = ref({
  login: '',
  pswd: '',
  name: '',
  email: '',
  office: '',
  active: 'Y',
  priv_admin: 'N',
  group_id: null
})

const groupData = ref({
  group_id: null,
  description: ''
})

const showResetDialog = ref(false)
const selectedUser = ref(null)
const newPassword = ref('')

const columns = [
  { name: 'login', label: 'Username', field: 'login', align: 'left', sortable: true },
  { name: 'name', label: 'Nama', field: 'name', align: 'left', sortable: true },
  { name: 'group_name', label: 'Group/Role', field: 'group_name', align: 'left', sortable: true },
  { name: 'office', label: 'Kantor', field: 'office', align: 'left' },
  { name: 'active', label: 'Status', field: 'active', align: 'center' },
  { name: 'actions', label: 'Aksi', align: 'center' }
]

const groupColumns = [
  { name: 'group_id', label: 'ID', field: 'group_id', align: 'left', sortable: true },
  { name: 'description', label: 'Deskripsi Group', field: 'description', align: 'left', sortable: true },
  { name: 'actions', label: 'Aksi', align: 'center' }
]

const fetchUsers = async () => {
  loading.value = true
  try {
    const response = await api.get('/settings/users')
    users.value = response.data
  } catch (error) {
    console.error('Fetch users error:', error)
  } finally {
    loading.value = false
  }
}

const fetchGroups = async () => {
  loadingGroups.value = true
  try {
    const response = await api.get('/settings/groups')
    groups.value = response.data
  } catch (error) {
    console.error('Fetch groups error:', error)
  } finally {
    loadingGroups.value = false
  }
}

const fetchOffices = async () => {
  try {
    const response = await api.get('/master/office')
    offices.value = response.data
  } catch (error) {}
}

const openAddDialog = () => {
  isEdit.value = false
  userData.value = {
    login: '', pswd: '', name: '', email: '', office: '', active: 'Y', priv_admin: 'N', group_id: null
  }
  showUserDialog.value = true
}

const editUser = (user) => {
  isEdit.value = true
  userData.value = { ...user }
  showUserDialog.value = true
}

const saveUser = async () => {
  saving.value = true
  try {
    if (isEdit.value) {
      await api.put(`/settings/users/${userData.value.login}`, userData.value)
      $q.notify({ color: 'positive', message: 'User berhasil diperbarui' })
    } else {
      await api.post('/settings/users', userData.value)
      $q.notify({ color: 'positive', message: 'User berhasil ditambahkan' })
    }
    showUserDialog.value = false
    fetchUsers()
  } catch (error) {
    $q.notify({ color: 'negative', message: 'Gagal menyimpan user' })
  } finally {
    saving.value = false
  }
}

const resetUserPassword = (user) => {
  selectedUser.value = user
  newPassword.value = ''
  showResetDialog.value = true
}

const confirmResetPassword = async () => {
  saving.value = true
  try {
    await api.put(`/settings/users/${selectedUser.value.login}`, {
      ...selectedUser.value,
      pswd: newPassword.value
    })
    $q.notify({ color: 'positive', message: 'Password berhasil direset' })
    showResetDialog.value = false
  } catch (error) {
    $q.notify({ color: 'negative', message: 'Gagal meriset password' })
  } finally {
    saving.value = false
  }
}

// GROUP LOGIC
const openGroupDialog = () => {
  isEditGroup.value = false
  groupData.value = { group_id: null, description: '' }
  showGroupDialog.value = true
}

const editGroup = (group) => {
  isEditGroup.value = true
  groupData.value = { ...group }
  showGroupDialog.value = true
}

const saveGroup = async () => {
  savingGroup.value = true
  try {
    if (isEditGroup.value) {
      await api.put(`/settings/groups/${groupData.value.group_id}`, groupData.value)
      $q.notify({ color: 'positive', message: 'Group berhasil diperbarui' })
    } else {
      await api.post('/settings/groups', groupData.value)
      $q.notify({ color: 'positive', message: 'Group berhasil ditambahkan' })
    }
    showGroupDialog.value = false
    fetchGroups()
  } catch (error) {
    $q.notify({ color: 'negative', message: error.response?.data?.message || 'Gagal menyimpan group' })
  } finally {
    savingGroup.value = false
  }
}

const deleteGroup = (group) => {
  $q.dialog({
    title: 'Hapus Group',
    message: `Apakah Anda yakin ingin menghapus group "${group.description}"?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await api.delete(`/settings/groups/${group.group_id}`)
      $q.notify({ color: 'positive', message: 'Group berhasil dihapus' })
      fetchGroups()
    } catch (error) {
      $q.notify({ color: 'negative', message: 'Gagal menghapus group' })
    }
  })
}

// NOTIFICATION BROADCAST
const sendBroadcast = async () => {
  $q.dialog({
    title: 'Konfirmasi Broadcast',
    message: 'Apakah Anda yakin ingin mengirim pesan ini ke seluruh pengguna yang terdaftar?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    sendingBroadcast.value = true
    try {
      await api.post('/notifications/broadcast', broadcast.value)
      $q.notify({
        color: 'positive',
        message: 'Broadcast berhasil dikirim ke seluruh antrean.',
        icon: 'done_all'
      })
      broadcast.value = { title: '', message: '', url: '/' }
    } catch (error) {
      $q.notify({
        color: 'negative',
        message: 'Gagal mengirim broadcast: ' + (error.response?.data?.message || error.message)
      })
    } finally {
      sendingBroadcast.value = false
    }
  })
}

onMounted(() => {
  fetchUsers()
  fetchGroups()
  fetchOffices()
})
</script>
