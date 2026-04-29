<script setup>
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { messageForAuthError } from '@/utils/authErrors'
import AppBrand from '@/components/AppBrand.vue'

const email = ref('')
const error = ref('')
const success = ref('')
const submitting = ref(false)
const { resetPasswordForEmail, loading } = useAuth()

async function handleSubmit() {
  error.value = ''
  success.value = ''
  if (!email.value.trim()) {
    error.value = 'Please enter your email address.'
    return
  }
  submitting.value = true
  try {
    await resetPasswordForEmail(email.value)
    success.value =
      'If an account exists for that address, we sent a reset link. Check your inbox and spam folder.'
  } catch (e) {
    error.value = messageForAuthError(e, 'Could not send reset email. Please try again.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <AppBrand tagline="Reset your password" />
      <h1>Forgot password</h1>
      <p class="lead">
        Enter the email you use to sign in. We will send you a link to choose a new password.
      </p>
      <form @submit.prevent="handleSubmit">
        <div class="field">
          <label for="forgot-email">Email</label>
          <input
            id="forgot-email"
            v-model="email"
            type="email"
            autocomplete="email"
            required
          />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="success" class="success">{{ success }}</p>
        <button type="submit" class="btn" :disabled="loading || submitting">
          {{ submitting ? 'Sending…' : 'Send reset link' }}
        </button>
      </form>
      <p class="link-line">
        <router-link to="/login">Back to log in</router-link>
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
  max-width: 400px;
  padding: 2rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
}
.auth-card h1 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-size: 1.5rem;
  line-height: 1.2;
}
.lead {
  margin: 0 0 1.25rem;
  font-size: 0.9rem;
  opacity: 0.85;
  text-align: left;
  line-height: 1.45;
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
@media (prefers-color-scheme: light) {
  .auth-card {
    border-color: rgba(0, 0, 0, 0.1);
    background: rgba(255, 255, 255, 0.9);
  }
  .field input {
    border-color: rgba(0, 0, 0, 0.2);
    background: #fff;
  }
}
</style>
