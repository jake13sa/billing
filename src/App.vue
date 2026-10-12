<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import SidebarMenu from './components/SidebarMenu.vue'
import { api, clearSessionToken, getSessionToken, setSessionToken } from './api'

const isDevelopment = import.meta.env.DEV
const isAuthenticated = ref(isDevelopment || Boolean(getSessionToken()))
const password = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)

async function signIn() {
  errorMessage.value = ''
  isSubmitting.value = true
  try {
    const response = await api.post('/auth/login', { password: password.value })
    setSessionToken(response.data.token)
    isAuthenticated.value = true
    password.value = ''
  } catch (error) {
    errorMessage.value = error.response?.data?.error || 'Unable to sign in. Check the API connection.'
  } finally {
    isSubmitting.value = false
  }
}

function signOut() {
  clearSessionToken()
  isAuthenticated.value = isDevelopment
  errorMessage.value = 'Your session has ended.'
}

function handleUnauthorized() {
  isAuthenticated.value = false
  errorMessage.value = 'Your session expired. Sign in again.'
}

onMounted(() => window.addEventListener('billing:unauthorized', handleUnauthorized))
onUnmounted(() => window.removeEventListener('billing:unauthorized', handleUnauthorized))
</script>

<template>
  <SidebarMenu v-if="isAuthenticated" :show-logout="!isDevelopment" @logout="signOut" />
  <main v-else class="sign-in-page">
    <form class="sign-in-form" @submit.prevent="signIn">
      <h1>Billing Tracker</h1>
      <label for="app-password">App password</label>
      <input
        id="app-password"
        v-model="password"
        type="password"
        autocomplete="current-password"
        required
      />
      <p v-if="errorMessage" class="sign-in-error" role="alert">{{ errorMessage }}</p>
      <button type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Signing in...' : 'Sign in' }}
      </button>
    </form>
  </main>
</template>

<style>
.sign-in-page {
  align-items: center;
  background: #f3f6f7;
  display: flex;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
}

.sign-in-form {
  background: #fff;
  border: 1px solid #d8e0e3;
  border-radius: 6px;
  display: grid;
  gap: 14px;
  max-width: 380px;
  padding: 28px;
  width: 100%;
}

.sign-in-form h1 {
  font-size: 1.5rem;
  margin: 0 0 8px;
}

.sign-in-form input,
.sign-in-form button {
  font: inherit;
  min-height: 44px;
  padding: 8px 12px;
}

.sign-in-form button {
  background: #247b6e;
  border: 0;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
}

.sign-in-form button:disabled {
  cursor: wait;
  opacity: 0.7;
}

.sign-in-error {
  color: #a12b2b;
  margin: 0;
}
</style>
