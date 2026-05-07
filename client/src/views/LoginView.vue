<template>
  <div class="auth-bg">
    <div class="glass-card">
      <div class="brand">
        <span class="brand-icon">🌿</span>
        <h1>FeelGut</h1>
      </div>

      <div class="tab-bar">
        <button :class="['tab', { active: mode === 'login' }]" @click="mode = 'login'">
          Login
        </button>
        <button :class="['tab', { active: mode === 'register' }]" @click="mode = 'register'">
          Registrieren
        </button>
      </div>

      <form @submit.prevent="submit">
        <div class="field">
          <input
            v-model="username"
            type="text"
            placeholder="Benutzername"
            autocomplete="username"
            required
            minlength="3"
          />
        </div>
        <div class="field">
          <input
            v-model="password"
            type="password"
            placeholder="Passwort"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            required
            minlength="6"
          />
        </div>
        <div class="field" v-if="mode === 'register'">
          <input
            v-model="passwordConfirm"
            type="password"
            placeholder="Passwort bestätigen"
            autocomplete="new-password"
            required
            minlength="6"
          />
        </div>

        <p class="error" v-if="error">{{ error }}</p>

        <button type="submit" class="submit-btn" :disabled="loading">
          {{ loading ? '...' : (mode === 'login' ? 'Anmelden' : 'Registrieren') }}
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import { resetAuthCache } from '../router/index.js'

export default {
  name: 'LoginView',
  data() {
    return {
      mode: 'login',
      username: '',
      password: '',
      passwordConfirm: '',
      error: '',
      loading: false,
    }
  },
  watch: {
    mode() {
      this.error = ''
      this.password = ''
      this.passwordConfirm = ''
    },
  },
  methods: {
    async submit() {
      this.error = ''

      if (this.mode === 'register' && this.password !== this.passwordConfirm) {
        this.error = 'Passwörter stimmen nicht überein.'
        return
      }

      this.loading = true
      try {
        const endpoint = this.mode === 'login' ? '/api/auth/login' : '/api/auth/register'
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username: this.username, password: this.password }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Fehler')
        resetAuthCache()
        this.$router.push('/log')
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },
  },
}
</script>

<style scoped>
.auth-bg {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #0d1b2a 0%, #1b2a4a 50%, #0d2137 100%);
}

/* Farbige Kugeln im Hintergrund — dadurch sieht man die Transparenz der Karte */
.auth-bg::before,
.auth-bg::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.55;
  pointer-events: none;
}
.auth-bg::before {
  width: 420px;
  height: 420px;
  background: radial-gradient(circle, #5b8dee, #3a5bd9);
  top: -80px;
  left: -80px;
}
.auth-bg::after {
  width: 360px;
  height: 360px;
  background: radial-gradient(circle, #a78bfa, #7c3aed);
  bottom: -60px;
  right: -60px;
}

.glass-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 380px;
  /* Authentisches Liquid Glass: wenig Blur, hohe Weiß-Transparenz */
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(4px) saturate(180%) brightness(110%);
  -webkit-backdrop-filter: blur(4px) saturate(180%) brightness(110%);
  border: 1px solid rgba(255, 255, 255, 0.75);
  border-radius: 32px;
  padding: 2.5rem 2rem;
  box-shadow:
    0 8px 40px rgba(0, 0, 0, 0.35),
    inset 0 4px 20px rgba(255, 255, 255, 0.25),
    inset 0 -2px 6px rgba(0, 0, 0, 0.08);
}

.brand {
  text-align: center;
  margin-bottom: 2rem;
}

.brand-icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 0.25rem;
}

.brand h1 {
  color: #fff;
  font-size: 1.8rem;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin: 0;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.tab-bar {
  display: flex;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 14px;
  padding: 4px;
  margin-bottom: 1.75rem;
  gap: 4px;
}

.tab {
  flex: 1;
  padding: 0.55rem;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab.active {
  background: rgba(255, 255, 255, 0.3);
  color: #fff;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.field {
  margin-bottom: 0.875rem;
}

.field input {
  width: 100%;
  padding: 0.85rem 1rem;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 14px;
  color: #fff;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
  box-sizing: border-box;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.08);
}

.field input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.field input:focus {
  border-color: rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.22);
}

.error {
  color: #fca5a5;
  font-size: 0.85rem;
  margin: 0.5rem 0 0.75rem;
  text-align: center;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.submit-btn {
  width: 100%;
  margin-top: 0.5rem;
  padding: 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.submit-btn:hover {
  background: rgba(255, 255, 255, 0.32);
}

.submit-btn:active {
  transform: scale(0.98);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
