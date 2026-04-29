<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import AppBrand from '@/components/AppBrand.vue'

function recoveryFromHash() {
  if (typeof window === 'undefined') return false
  const raw = window.location.hash?.replace(/^#/, '') ?? ''
  return new URLSearchParams(raw).get('type') === 'recovery'
}

const { passwordRecoveryActive, updatePassword, signOut, initAuth } = useAuth()

const allowPasswordReset = computed(
  () => recoveryFromHash() || passwordRecoveryActive.value,
)

const checkingLink = ref(true)
const resetSuccess = ref(false)
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const submitting = ref(false)

const router = useRouter()

onMounted(async () => {
  await initAuth()
  checkingLink.value = false
})

async function handleSubmit() {
  error.value = ''
  if (!password.value || !confirmPassword.value) {
    error.value = 'Enter and confirm your new password.'
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
    await updatePassword(password.value)
    await signOut()
    resetSuccess.value = true
    // Strip recovery tokens from the URL so router/initAuth does not set
    // passwordRecoveryActive again and block navigation to /login.
    if (typeof window !== 'undefined' && window.history.replaceState) {
      const { pathname, search } = window.location
      window.history.replaceState(window.history.state, '', `${pathname}${search}`)
    }
  } catch (e) {
    error.value = e?.message ?? 'Could not update password. Try requesting a new link.'
  } finally {
    submitting.value = false
  }

  if (resetSuccess.value) {
    await new Promise((r) => setTimeout(r, 1400))
    try {
      await router.replace({ name: 'login', query: { reset: 'ok' } })
    } catch {
      const { fullPath } = router.resolve({ name: 'login', query: { reset: 'ok' } })
      window.location.assign(`${window.location.origin}${fullPath}`)
    }
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <AppBrand tagline="Choose a new password" />
      <h1>Set new password</h1>

      <p v-if="checkingLink" class="muted">Checking your link…</p>

      <template v-else-if="resetSuccess">
        <div class="success-block" role="status" aria-live="polite">
          <p class="success-title">Password updated</p>
          <p class="success-text">
            Your new password is saved. Taking you to the log in page…
          </p>
        </div>
      </template>

      <template v-else-if="allowPasswordReset">
        <p class="lead">Enter a new password for your account.</p>
        <form @submit.prevent="handleSubmit">
          <div class="field">
            <label for="reset-password">New password</label>
            <input
              id="reset-password"
              v-model="password"
              type="password"
              autocomplete="new-password"
              required
              minlength="6"
            />
          </div>
          <div class="field">
            <label for="reset-confirm">Confirm password</label>
            <input
              id="reset-confirm"
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              required
              minlength="6"
            />
          </div>
          <p v-if="error" class="error">{{ error }}</p>
          <button type="submit" class="btn" :disabled="submitting">
            {{ submitting ? 'Saving…' : 'Update password' }}
          </button>
        </form>
      </template>

      <template v-else>
        <p class="lead invalid">
          This page is only for password reset links from email. The link may have expired.
        </p>
        <p class="link-line">
          <router-link :to="{ name: 'forgot-password' }">Request a new link</router-link>
          ·
          <router-link :to="{ name: 'login' }">Log in</router-link>
        </p>
      </template>
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
.lead.invalid {
  opacity: 1;
}
.muted {
  margin: 0 0 1rem;
  font-size: 0.95rem;
  opacity: 0.75;
}
.success-block {
  margin: 0;
  padding: 1rem 1.1rem;
  text-align: left;
  border-radius: 8px;
  border: 1px solid rgba(74, 222, 128, 0.35);
  background: rgba(74, 222, 128, 0.12);
}
.success-title {
  margin: 0 0 0.35rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: #4ade80;
}
.success-text {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.45;
  opacity: 0.95;
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
  margin-top: 1rem;
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
  .success-block {
    border-color: rgba(22, 163, 74, 0.35);
    background: rgba(22, 163, 74, 0.1);
  }
  .success-title {
    color: #15803d;
  }
}
</style>
