import { boot } from 'quasar/wrappers'
import axios from 'axios'
import { api } from '../api'
import { useAuthStore } from 'stores/auth'

export default boot(({ app, store }) => {
  // Use a dynamic import or ensure Pinia is ready
  const authStore = useAuthStore(store)
  
  // Set auth header from store if token exists
  if (authStore.token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${authStore.token}`
  }

  app.config.globalProperties.$axios = axios
  app.config.globalProperties.$api = api
})

export { api }
