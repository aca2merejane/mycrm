<template>
  <q-layout view="hHh Lpr lff">
    <q-header class="bg-transparent text-white">
      <q-toolbar class="bg-bmh-tosca curved-toolbar shadow-2">
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title class="text-weight-bold">
          BMH Apps
        </q-toolbar-title>

        <q-space />

        <div class="row items-center no-wrap">
          <q-btn-dropdown flat no-caps stretch>
            <template v-slot:label>
              <div class="row items-center no-wrap">
                <q-avatar size="28px" class="q-mr-sm">
                  <q-icon name="account_circle" />
                </q-avatar>
                <div class="text-subtitle2">{{ authStore.user?.name || 'User' }}</div>
              </div>
            </template>

            <q-list style="min-width: 150px">
              <q-item clickable v-ripple to="/profile">
                <q-item-section avatar>
                  <q-icon name="person" />
                </q-item-section>
                <q-item-section>Profile</q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-ripple @click="onLogout" class="text-negative">
                <q-item-section avatar>
                  <q-icon name="logout" color="negative" />
                </q-item-section>
                <q-item-section>Logout</q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered class="bg-grey-1">
      <q-list>
        <q-item-label header class="text-weight-bold text-uppercase text-grey-7"> 
          Main Navigation 
        </q-item-label>

        <template v-for="(menu, index) in menuList" :key="index">
          <q-item v-if="!menu.children" clickable v-ripple :to="menu.to" exact active-class="text-bmh-tosca bg-teal-1">
            <q-item-section avatar>
              <q-icon :name="menu.icon" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ menu.title }}</q-item-label>
              <q-item-label caption v-if="menu.caption">{{ menu.caption }}</q-item-label>
            </q-item-section>
          </q-item>

          <q-expansion-item v-else
            expand-separator
            :icon="menu.icon"
            :label="menu.title"
            :caption="menu.caption"
            active-class="text-bmh-tosca"
          >
            <q-item v-for="(child, cIndex) in menu.children" :key="cIndex"
              clickable v-ripple :to="child.to" exact class="q-ml-md"
              active-class="text-bmh-tosca bg-teal-1"
            >
              <q-item-section avatar>
                <q-icon :name="child.icon" size="sm" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ child.title }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-expansion-item>
        </template>
      </q-list>
    </q-drawer>

    <q-page-container class="bg-grey-1" :class="{ 'q-pb-xl-extra': $q.screen.lt.md }">
      <router-view />
    </q-page-container>

    <!-- Fixed Bottom Nav for Mobile -->
    <div v-if="$q.screen.lt.md" v-show="showBottomNav" class="mobile-nav-wrapper fixed-bottom">
      <div class="mobile-nav-container curved-top shadow-10 row no-wrap justify-around items-center">
        <router-link v-for="item in mobileMenu" :key="item.to" :to="item.to" v-slot="{ isActive, isExactActive, navigate }" custom>
          <div @click="navigate" class="nav-item flex flex-center column" 
            :class="{ 'nav-active': item.to === '/' ? isExactActive : isActive }"
          >
            <q-icon 
              :name="(item.to === '/' ? isExactActive : isActive) ? item.activeIcon : item.icon" 
              :color="(item.to === '/' ? isExactActive : isActive) ? 'bmh-tosca' : 'grey-7'" 
              size="24px" 
            />
            <span class="nav-label" 
              :class="(item.to === '/' ? isExactActive : isActive) ? 'text-bmh-tosca text-weight-bold' : 'text-grey-7'"
            >
              {{ item.title }}
            </span>
            <div v-if="item.to === '/' ? isExactActive : isActive" class="active-indicator bg-bmh-tosca"></div>
          </div>
        </router-link>
      </div>
    </div>
  </q-layout>
</template>

<script setup>
import { ref, onMounted, getCurrentInstance } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()
const { proxy } = getCurrentInstance()

onMounted(() => {
  // Subscribe to push notifications if authenticated
  if (authStore.isAuthenticated && Notification.permission !== 'granted') {
    setTimeout(async () => {
      const res = await proxy.$subscribePush();
      if (res) {
        $q.notify({
          color: 'positive',
          message: 'Anda akan menerima notifikasi dari Admin',
          icon: 'notifications_active'
        });
      }
    }, 2000);
  }
})

const menuList = [
  {
    title: 'Dashboard',
    caption: 'Overview Statistik',
    icon: 'dashboard',
    to: '/',
  },
  {
    title: 'Donasi',
    caption: 'Kelola Transaksi',
    icon: 'account_balance_wallet',
    children: [
      { title: 'Input Donasi', icon: 'add_circle', to: '/transactions/new' },
      { title: 'Riwayat Transaksi', icon: 'history', to: '/transactions' },
      { title: 'Penerimaan Rutin', icon: 'autorenew', to: '/transactions/routine' },
    ]
  },
  {
    title: 'Master Data',
    caption: 'Kelola Data Dasar',
    icon: 'layers',
    children: [
      { title: 'Donatur', icon: 'people', to: '/master/donatur' },
      { title: 'Produk Donasi', icon: 'inventory_2', to: '/master/product' },
      { title: 'Metode Bayar', icon: 'payments', to: '/master/payment-method' },
      { title: 'Kantor / Office', icon: 'business', to: '/master/office' },
      { title: 'Chart of Accounts', icon: 'account_tree', to: '/master/coa' },
    ]
  },
  {
    title: 'Laporan',
    caption: 'Donasi & Keuangan',
    icon: 'assessment',
    children: [
      { title: 'Rekap Donasi', icon: 'summarize', to: '/reports/donation' },
      { title: 'Laporan Jurnal', icon: 'account_balance', to: '/reports/jurnal' },
      { title: 'Laporan Keuangan', icon: 'receipt_long', to: '/reports/financial' },
      { title: 'Laporan Qurban', icon: 'pets', to: '/reports/qurban' },
    ]
  },
  {
    title: 'Pengaturan',
    caption: 'Akses & Sistem',
    icon: 'settings',
    to: '/settings',
  },
]

const mobileMenu = [
  { title: 'Transaksi', icon: 'receipt_long', activeIcon: 'receipt_long', to: '/transactions' },
  { title: 'Home', icon: 'home', activeIcon: 'home', to: '/' },
  { title: 'Laporan', icon: 'assessment', activeIcon: 'assessment', to: '/reports/donation' },
]

const leftDrawerOpen = ref(false)
const showBottomNav = ref(true)
let lastScrollPosition = 0

// Smart Hide on Scroll Logic
window.addEventListener('scroll', () => {
  if (!$q.screen.lt.md) return
  const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop
  if (currentScrollPosition < 0) return
  
  if (Math.abs(currentScrollPosition - lastScrollPosition) < 30) return
  
  showBottomNav.value = currentScrollPosition < lastScrollPosition || currentScrollPosition < 50
  lastScrollPosition = currentScrollPosition
})

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

function onLogout() {
  $q.dialog({
    title: 'Logout',
    message: 'Apakah Anda yakin ingin keluar?',
    cancel: true,
    persistent: true
  }).onOk(() => {
    authStore.logout()
    router.push('/login')
    $q.notify({
      color: 'info',
      message: 'Anda telah keluar sistem',
      icon: 'logout'
    })
  })
}
</script>

<style lang="scss">
.text-bmh-tosca {
  color: #14B8A6 !important;
}
.bg-bmh-tosca {
  background-color: #14B8A6 !important;
}

.q-pb-xl-extra {
  padding-bottom: 90px !important;
}

/* Hide navigation when dialog is open to avoid overlap */
body.q-body--dialog .mobile-nav-wrapper {
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
}

/* Mobile Nav Styling - Fixed Full Width */
.mobile-nav-wrapper {
  bottom: 0;
  width: 100%;
  z-index: 2000; /* Lower than Quasar dialogs (6000+) but higher than content */
  transition: opacity 0.3s ease, visibility 0.3s ease;
}

.mobile-nav-container {
  background: white;
  width: 100%;
  height: 65px;
  border-top: 1px solid #e0e0e0;
  padding: 0;
}

.nav-item {
  position: relative;
  flex: 1;
  height: 100%;
  cursor: pointer;
  transition: all 0.2s ease;
  padding-top: 2px;
}

.nav-label {
  font-size: 10px;
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.nav-active {
  .q-icon {
    transform: translateY(-5px);
  }
}

.active-indicator {
  position: absolute;
  bottom: 8px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
}

/* Bouncing Animation on active/interaction */
@keyframes bounceUp {
  0%, 100% { transform: translateY(-5px); }
  50% { transform: translateY(-10px); }
}

.nav-active .q-icon {
  animation: bounceUp 2s infinite ease-in-out;
}

.no-pointer-events {
  pointer-events: none;
}
.pointer-events-all {
  pointer-events: all;
}

/* Transition for Sliding */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(120%);
}

.curved-toolbar {
  border-bottom-left-radius: 15px;
  border-bottom-right-radius: 15px;
  padding-bottom: 8px;
  padding-top: 8px;
}

.curved-top {
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
}
</style>
