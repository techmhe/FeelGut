import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import LogView from '../views/LogView.vue'
import AddEntryView from '../views/AddEntryView.vue'
import SettingsView from '../views/SettingsView.vue'
import ExportView from '../views/ExportView.vue'

const routes = [
  { path: '/', redirect: '/log' },
  { path: '/login', component: LoginView, meta: { public: true } },
  { path: '/log', component: LogView },
  { path: '/add', component: AddEntryView },
  { path: '/edit/:id', component: AddEntryView },
  { path: '/settings', component: SettingsView },
  { path: '/export', component: ExportView },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Gecachtes Auth-Ergebnis — wird nur einmal pro Session vom Server abgefragt
let cachedAuth = undefined

async function checkAuth() {
  if (cachedAuth !== undefined) return cachedAuth
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' })
    cachedAuth = res.ok
  } catch {
    cachedAuth = false
  }
  return cachedAuth
}

// Cache zurücksetzen wenn sich Login-Status ändert (Login/Logout)
export function resetAuthCache() {
  cachedAuth = undefined
}

router.beforeEach(async (to) => {
  const isPublic = to.meta.public === true
  const isLoggedIn = await checkAuth()

  if (!isPublic && !isLoggedIn) return '/login'
  if (to.path === '/login' && isLoggedIn) return '/log'
})

export default router
