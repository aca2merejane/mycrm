<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page class="flex flex-center bg-grey-1">
        <q-card class="login-card shadow-24" style="width: 400px; max-width: 90vw; border-radius: 12px; overflow: hidden;">
          <div class="q-pa-xl">
            <div class="text-center q-mb-xl">
              <div class="flex flex-center q-mb-md">
                <q-icon name="account_balance_wallet" size="64px" color="bmh-orange" />
              </div>
              <h1 class="text-h4 text-weight-bold text-grey-9 q-my-none">BMH Financial</h1>
              <p class="text-subtitle1 text-grey-6 q-mt-sm">Access your ERP Dashboard</p>
            </div>

            <q-form @submit="onSubmit" class="q-gutter-md">
              <q-input
                v-model="login.email"
                label="Email"
                type="email"
                outlined
                rounded 
                bg-color="white"
                color="bmh-tosca"
                lazy-rules
                :rules="[ val => val && val.length > 0 || 'Email is required']"
                class="q-mb-sm"
              >
                <template v-slot:prepend>
                  <q-icon name="email" color="grey-6" />
                </template>
              </q-input>

              <q-input
                v-model="login.password"
                label="Password"
                :type="showPassword ? 'text' : 'password'"
                outlined
                rounded 
                bg-color="white"
                color="bmh-tosca"
                lazy-rules
                :rules="[ val => val && val.length > 0 || 'Password is required']"
              >
                <template v-slot:prepend>
                  <q-icon name="lock" color="grey-6" />
                </template>
                <template v-slot:append>
                  <q-icon
                    :name="showPassword ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="showPassword = !showPassword"
                    color="grey-6"
                  />
                </template>
              </q-input>

              <div class="q-mt-xl">
                <q-btn
                  label="Sign In"
                  type="submit"
                  color="bmh-orange"
                  class="full-width text-weight-bold"
                  size="lg"
                  unelevated
                  :loading="loading"
                  style="border-radius: 8px;"
                />
              </div>
            </q-form>

            <div class="text-center q-mt-lg">
              <q-btn flat no-caps color="grey-6" label="Forgot your password?" @click="showResetDialog = true" class="text-caption hover-underline" />
            </div>
          </div>
          
          <div class="bg-bmh-tosca q-pa-sm text-center text-white text-caption">
            &copy; 2024 BMH Financial Systems • Secure Access
          </div>
        </q-card>
 
        <!-- Forgot Password Dialog -->
        <q-dialog v-model="showResetDialog" persistent>
          <q-card style="min-width: 350px; border-radius: 12px;">
            <q-card-section class="row items-center q-pb-none">
              <div class="text-h6">Reset Password</div>
              <q-space />
              <q-btn icon="close" flat round dense v-close-popup />
            </q-card-section>
 
            <q-card-section class="q-pt-md">
              <div v-if="resetStep === 1">
                <p class="text-body2 text-grey-7 q-mb-md">Enter your username and registered email to verify your identity.</p>
                <q-form @submit="onVerifyReset" class="q-gutter-sm">
                  <q-input v-model="resetForm.username" label="Username" outlined dense color="bmh-tosca" />
                  <q-input v-model="resetForm.email" label="Email" type="email" outlined dense color="bmh-tosca" />
                  <div class="row reverse q-mt-md">
                    <q-btn label="Verify" type="submit" color="bmh-tosca" :loading="resetLoading" />
                    <q-btn label="Cancel" flat color="grey-7" v-close-popup class="q-mr-sm" />
                  </div>
                </q-form>
              </div>
 
              <div v-else-if="resetStep === 2">
                <p class="text-body2 text-grey-7 q-mb-md">Verification successful! Enter your new password below.</p>
                <q-form @submit="onPerformReset" class="q-gutter-sm">
                  <q-input v-model="resetForm.newPassword" label="New Password" type="password" outlined dense color="bmh-orange" />
                  <div class="row reverse q-mt-md">
                    <q-btn label="Reset Password" type="submit" color="bmh-orange" :loading="resetLoading" />
                  </div>
                </q-form>
              </div>
            </q-card-section>
          </q-card>
        </q-dialog>

        <!-- Subtle Background Elements -->
        <div class="absolute-top-right q-mt-xl q-mr-xl opacity-20 hide-on-mobile">
          <q-icon name="trending_up" size="300px" color="bmh-tosca" />
        </div>
        <div class="absolute-bottom-left q-mb-xl q-ml-xl opacity-20 hide-on-mobile">
          <q-icon name="pie_chart" size="300px" color="bmh-orange" />
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const showPassword = ref(false)
const login = reactive({
  email: '',
  password: ''
})

// Reset Password State
const showResetDialog = ref(false)
const resetLoading = ref(false)
const resetStep = ref(1)
const resetForm = reactive({
  username: '',
  email: '',
  newPassword: ''
})

const onSubmit = async () => {
  loading.value = true
  try {
    const success = await authStore.login(login.email, login.password)
    if (success) {
      $q.notify({
        color: 'positive',
        message: 'Welcome back, ' + authStore.user.name,
        icon: 'check_circle',
        position: 'top'
      })
      router.push('/')
    }
  } catch (error) {
    $q.notify({
      color: 'negative',
      message: error.response?.data?.message || 'Login failed. Please check your credentials.',
      icon: 'error',
      position: 'top'
    })
  } finally {
    loading.value = false
  }
}

const onVerifyReset = async () => {
  if (!resetForm.username || !resetForm.email) {
    $q.notify({ color: 'warning', message: 'Please fill in both fields', icon: 'warning' })
    return
  }
  resetLoading.value = true
  const result = await authStore.verifyReset(resetForm.username, resetForm.email)
  resetLoading.value = false
  
  if (result.success) {
    $q.notify({ color: 'positive', message: result.message, icon: 'verified' })
    resetStep.value = 2
  } else {
    $q.notify({ color: 'negative', message: result.message, icon: 'error' })
  }
}

const onPerformReset = async () => {
  if (!resetForm.newPassword) {
    $q.notify({ color: 'warning', message: 'Please enter a new password', icon: 'warning' })
    return
  }
  resetLoading.value = true
  const result = await authStore.resetPassword(resetForm.username, resetForm.email, resetForm.newPassword)
  resetLoading.value = false

  if (result.success) {
    $q.notify({ color: 'positive', message: result.message, icon: 'check_circle' })
    showResetDialog.value = false
    resetStep.value = 1
    // Clear form
    resetForm.username = ''
    resetForm.email = ''
    resetForm.newPassword = ''
  } else {
    $q.notify({ color: 'negative', message: result.message, icon: 'error' })
  }
}
</script>

<style scoped>
.login-card {
  transition: transform 0.3s ease;
  z-index: 10;
}
.login-card:hover {
  transform: translateY(-5px);
}
.opacity-20 {
  opacity: 0.1;
}
.hover-underline:hover {
  text-decoration: underline;
}
@media (max-width: 600px) {
  .hide-on-mobile {
    display: none;
  }
}

/* Ensure branding colors are available if tailwind isn't fully ready yet */
.text-bmh-orange { color: #F59E0B; }
.bg-bmh-orange { background-color: #F59E0B; }
.text-bmh-tosca { color: #14B8A6; }
.bg-bmh-tosca { background-color: #14B8A6; }
</style>
