const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/DashboardPage.vue') },
      { path: 'master/office', component: () => import('pages/master/OfficePage.vue') },
      { path: 'master/payment-method', component: () => import('pages/master/PaymentMethodPage.vue') },
      { path: 'master/coa', component: () => import('pages/master/COAPage.vue') },
      { path: 'master/product', component: () => import('pages/master/ProductPage.vue') },
      { path: 'master/donatur', component: () => import('pages/master/DonaturPage.vue') },
      { path: 'transactions', component: () => import('pages/transactions/TransactionHistoryPage.vue') },
      { path: 'transactions/new', component: () => import('pages/transactions/InputDonasiPage.vue') },
      { path: 'transactions/routine', component: () => import('pages/transactions/RoutineDonationPage.vue') },
      { path: 'reports/donation', component: () => import('pages/reports/DonationReportPage.vue') },
      { path: 'reports/jurnal', component: () => import('pages/reports/JournalReportPage.vue') },
      { path: 'reports/financial', component: () => import('pages/reports/FinancialReportPage.vue') },
      { path: 'reports/qurban', component: () => import('pages/reports/QurbanReportPage.vue') },
      { path: 'profile', component: () => import('pages/ProfilePage.vue') },
      { path: 'settings', component: () => import('pages/SettingsPage.vue') },
    ],
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    component: () => import('pages/LoginPage.vue')
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
