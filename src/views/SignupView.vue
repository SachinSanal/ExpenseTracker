<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import AppBrand from '@/components/AppBrand.vue'

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const success = ref('')
const submitting = ref(false)
const { signUp, loading } = useAuth()
const router = useRouter()

async function handleSubmit() {
  error.value = ''
  success.value = ''
  if (!email.value || !password.value) {
    error.value = 'Please enter email and password.'
    return
  }
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.'
    return
  }
  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters.'
    return
  }
  submitting.value = true
  try {
    await signUp(email.value, password.value)
    success.value = 'Account created. Check your email to confirm your account, then log in.'
  } catch (e) {
    error.value = e?.message ?? 'Sign up failed. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <AppBrand tagline="Create an account to get started" />
      <h1>Sign up</h1>
      <form @submit.prevent="handleSubmit">
        <div class="field">
          <label for="signup-email">Email</label>
          <input
            id="signup-email"
            v-model="email"
            type="email"
            autocomplete="email"
            required
          />
        </div>
        <div class="field">
          <label for="signup-password">Password</label>
          <input
            id="signup-password"
            v-model="password"
            type="password"
            autocomplete="new-password"
            required
          />
        </div>
        <div class="field">
          <label for="signup-confirm">Confirm password</label>
          <input
            id="signup-confirm"
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            required
          />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="success" class="success">{{ success }}</p>
        <button type="submit" class="btn" :disabled="loading || submitting">
          {{ submitting ? 'Creating account…' : 'Sign up' }}
        </button>
      </form>
      <p class="link-line">
        Already have an account? <router-link to="/login">Log in</router-link>
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
.success {
  color: #4ade80;
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
