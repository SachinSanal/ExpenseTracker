import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import SignupView from '@/views/SignupView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { requiresAuth: true },
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { guest: true },
  },
  {
    path: '/signup',
    name: 'signup',
    component: SignupView,
    meta: { guest: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to, _from, next) => {
  const { session, initAuth } = useAuth()
  await initAuth()
  const authenticated = !!session.value
  if (to.meta.requiresAuth && !authenticated) {
    next({ name: 'login' })
  } else if (to.meta.guest && authenticated) {
    next({ name: 'home' })
  } else {
    next()
  }
})

export default router
