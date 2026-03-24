<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import AppBrand from '@/components/AppBrand.vue'

const email = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)
const { signIn, loading } = useAuth()
const router = useRouter()

async function handleSubmit() {
  error.value = ''
  if (!email.value || !password.value) {
    error.value = 'Please enter email and password.'
    return
  }
  submitting.value = true
  try {
    await signIn(email.value, password.value)
    router.push({ name: 'home' })
  } catch (e) {
    error.value = e?.message ?? 'Invalid credentials. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <AppBrand tagline="Sign in to continue" />
      <h1>Log in</h1>
      <form @submit.prevent="handleSubmit">
        <div class="field">
          <label for="login-email">Email</label>
          <input
            id="login-email"
            v-model="email"
            type="email"
            autocomplete="email"
            required
          />
        </div>
        <div class="field">
          <label for="login-password">Password</label>
          <input
            id="login-password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
          />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <button type="submit" class="btn" :disabled="loading || submitting">
          {{ submitting ? 'Signing in…' : 'Log in' }}
        </button>
      </form>
      <p class="link-line">
        Don't have an account? <router-link to="/signup">Sign up</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.auth-card {
  width: 100%;
  max-width: 360px;
  padding: 2rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
}
.auth-card h1 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  line-height: 1.2;
}
.field {
  margin-bottom: 1rem;
  text-align: left;
}
.field label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.9rem;
}
.field input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.2);
  box-sizing: border-box;
}
.error {
  color: #f87171;
  font-size: 0.9rem;
  margin: 0.5rem 0;
}
.btn {
  width: 100%;
  margin-top: 0.5rem;
  padding: 0.6rem;
}
.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.link-line {
  margin-top: 1.5rem;
  font-size: 0.95rem;
}
</style>
