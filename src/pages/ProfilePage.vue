<template>
  <q-page padding class="bg-grey-1">
    <div class="row q-col-gutter-lg justify-center">
      <div class="col-12 col-md-8">
        <!-- Profile info -->
        <q-card class="shadow-1 q-mb-md">
          <q-card-section class="bg-bmh-tosca text-white">
            <div class="text-h6">Profil Pengguna</div>
            <div class="text-subtitle2">Informasi akun Anda</div>
          </q-card-section>

          <q-card-section>
            <div class="row q-col-gutter-md items-center">
              <div class="col-12 col-sm-auto text-center">
                <q-avatar size="100px" font-size="52px" color="teal-1" text-color="bmh-tosca" icon="person" />
              </div>
              <div class="col-12 col-sm">
                <div class="text-h5 text-weight-bold">{{ profile.name }}</div>
                <div class="text-grey-7">{{ profile.email || 'Email belum diatur' }}</div>
                <q-chip dense outline color="primary" class="q-mt-xs">
                  ID: {{ profile.login }}
                </q-chip>
                <q-chip dense outline color="secondary" class="q-mt-xs">
                  Kantor: {{ profile.office_name || profile.office || 'Pusat' }}
                </q-chip>
              </div>
              <div class="col-12 col-sm-auto">
                <q-btn outline color="bmh-tosca" label="Edit Profil" @click="showEditDialog = true" />
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Change Password -->
        <q-card class="shadow-1">
          <q-card-section>
            <div class="text-h6 text-weight-bold">Keamanan Akun</div>
            <div class="text-subtitle2 text-grey-7">Ganti kata sandi secara berkala</div>
          </q-card-section>

          <q-card-section>
            <q-form @submit="onChangePassword" class="q-gutter-md">
              <q-input
                v-model="passwordData.oldPassword"
                type="password"
                label="Kata Sandi Lama"
                outlined
                dense
                :rules="[val => !!val || 'Kata sandi lama wajib diisi']"
              />
              <q-input
                v-model="passwordData.newPassword"
                type="password"
                label="Kata Sandi Baru"
                outlined
                dense
                :rules="[
                  val => !!val || 'Kata sandi baru wajib diisi',
                  val => val.length >= 6 || 'Minimal 6 karakter'
                ]"
              />
              <q-input
                v-model="passwordData.confirmPassword"
                type="password"
                label="Konfirmasi Kata Sandi Baru"
                outlined
                dense
                :rules="[
                  val => !!val || 'Konfirmasi kata sandi wajib diisi',
                  val => val === passwordData.newPassword || 'Kata sandi tidak cocok'
                ]"
              />

              <div class="row justify-end">
                <q-btn label="Update Password" type="submit" color="bmh-tosca" :loading="savingPassword" />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Edit Profile Dialog -->
    <q-dialog v-model="showEditDialog">
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Edit Profil</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-form @submit="onUpdateProfile" class="q-gutter-md">
            <q-input v-model="editData.name" label="Nama Lengkap" outlined dense :rules="[val => !!val || 'Nama wajib diisi']" />
            <q-input v-model="editData.email" label="Email" outlined dense type="email" />

            <div class="row justify-end q-mt-md">
              <q-btn flat label="Batal" v-close-popup />
              <q-btn label="Simpan" type="submit" color="bmh-tosca" :loading="savingProfile" />
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

const profile = ref({
  login: '',
  name: '',
  email: '',
  office: '',
  office_name: ''
})

const editData = ref({
  name: '',
  email: ''
})

const passwordData = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const showEditDialog = ref(false)
const savingProfile = ref(false)
const savingPassword = ref(false)

const fetchProfile = async () => {
  try {
    const response = await api.get('/profile')
    profile.value = response.data
    // Update labels in auth store if name changed
    if (authStore.user) {
      authStore.user.name = response.data.name
    }
    // Prefill edit data instantly when profile is loaded
    editData.value = {
      name: response.data.name,
      email: response.data.email
    }
  } catch (error) {
    console.error('Fetch profile error:', error)
    $q.notify({ color: 'negative', message: 'Gagal memuat profil' })
  }
}

const onUpdateProfile = async () => {
  savingProfile.value = true
  try {
    await api.put('/profile', {
      name: editData.value.name,
      email: editData.value.email
    })
    $q.notify({ color: 'positive', message: 'Profil berhasil diperbarui', icon: 'check' })
    showEditDialog.value = false
    fetchProfile()
  } catch (error) {
    $q.notify({ color: 'negative', message: 'Gagal memperbarui profil' })
  } finally {
    savingProfile.value = false
  }
}

const onChangePassword = async () => {
  savingPassword.value = true
  try {
    await api.put('/profile/change-password', {
      oldPassword: passwordData.value.oldPassword,
      newPassword: passwordData.value.newPassword
    })
    $q.notify({ color: 'positive', message: 'Password berhasil diperbarui', icon: 'lock' })
    passwordData.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  } catch (error) {
    const message = error.response?.data?.message || 'Gagal mengganti password'
    $q.notify({ color: 'negative', message })
  } finally {
    savingPassword.value = false
  }
}

onMounted(() => {
  fetchProfile()
})
</script>

<style lang="scss" scoped>
.bg-bmh-tosca {
  background-color: #14B8A6 !important;
}
.text-bmh-tosca {
  color: #14B8A6 !important;
}
</style>
