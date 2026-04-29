import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import SignupView from '@/views/SignupView.vue'
import ForgotPasswordView from '@/views/ForgotPasswordView.vue'
import ResetPasswordView from '@/views/ResetPasswordView.vue'

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
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: ForgotPasswordView,
    meta: { guest: true },
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: ResetPasswordView,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to, _from, next) => {
  const { session, initAuth, passwordRecoveryActive } = useAuth()
  await initAuth()
  const authenticated = !!session.value

  if (passwordRecoveryActive.value && to.name !== 'reset-password') {
    next({ name: 'reset-password' })
    return
  }

  if (to.meta.requiresAuth && !authenticated) {
    next({ name: 'login' })
  } else if (to.meta.guest && authenticated) {
    next({ name: 'home' })
  } else {
    next()
  }
})

export default router
