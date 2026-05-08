<template>
  <div class="settings-view">
    <header class="page-header">
      <h1>Konto</h1>
    </header>

    <!-- Benutzer-Info -->
    <div class="glass-card">
      <div class="user-info" v-if="user">
        <div class="avatar">{{ user.username[0].toUpperCase() }}</div>
        <div class="user-details">
          <div class="user-name">{{ user.username }}</div>
          <div class="user-label">Eingeloggt</div>
        </div>
      </div>

      <div class="divider" />

      <!-- Passwort ändern -->
      <div class="section-title">Passwort ändern</div>
      <form @submit.prevent="changePassword">
        <div class="field">
          <input type="password" v-model="pw.current" placeholder="Aktuelles Passwort" required />
        </div>
        <div class="field">
          <input type="password" v-model="pw.next" placeholder="Neues Passwort" required minlength="6" />
        </div>
        <div class="field">
          <input type="password" v-model="pw.confirm" placeholder="Neues Passwort bestätigen" required minlength="6" />
        </div>
        <p class="msg error" v-if="pw.error">{{ pw.error }}</p>
        <p class="msg success" v-if="pw.success">Passwort erfolgreich geändert.</p>
        <button type="submit" class="glass-btn" :disabled="pw.loading">
          {{ pw.loading ? '…' : 'Passwort aktualisieren' }}
        </button>
      </form>

      <div class="divider" />

      <button class="glass-btn export" @click="$router.push('/export')">
        Einträge exportieren (CSV / PDF)
      </button>

      <div class="divider" />

      <button class="glass-btn danger" @click="logout">Abmelden</button>
      <button class="glass-btn danger destructive" @click="deleteAccount">Account löschen</button>
    </div>

    <!-- About -->
    <div class="glass-card about-card">
      <div class="about-title">Über FeelGut</div>
      <p class="about-text">FeelGut hilft dir, deine Ernährung und Symptome zu tracken, um deine Verdauungsgesundheit besser zu verstehen.</p>
      <p class="version">Version 1.1.0</p>
    </div>

  </div>
</template>

<script>
import { resetAuthCache } from '../router/index.js'

export default {
  name: 'SettingsView',
  data() {
    return {
      user: null,
      pw: {
        current: '',
        next: '',
        confirm: '',
        error: '',
        success: false,
        loading: false,
      },
    }
  },
  async created() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      const data = await res.json()
      this.user = data.user
    } catch {
      // Netzwerkfehler
    }
  },
  methods: {
    async changePassword() {
      this.pw.error = ''
      this.pw.success = false

      if (this.pw.next !== this.pw.confirm) {
        this.pw.error = 'Neue Passwörter stimmen nicht überein.'
        return
      }

      this.pw.loading = true
      try {
        const res = await fetch('/api/auth/change-password', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ currentPassword: this.pw.current, newPassword: this.pw.next }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Fehler')
        this.pw.success = true
        this.pw.current = ''
        this.pw.next = ''
        this.pw.confirm = ''
      } catch (e) {
        this.pw.error = e.message
      } finally {
        this.pw.loading = false
      }
    },
    async logout() {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      resetAuthCache()
      this.$router.push('/login')
    },
    async deleteAccount() {
      if (!confirm('Account wirklich löschen? Alle Daten werden unwiderruflich gelöscht.')) return
      try {
        await fetch('/api/auth/delete-account', { method: 'DELETE', credentials: 'include' })
        resetAuthCache()
        this.$router.push('/login')
      } catch {
        // Fehler ignorieren
      }
    },
  },
}
</script>

<style scoped>
.settings-view {
  padding: 1.5rem 1rem 1rem;
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page-header h1 {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.glass-card {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 28px;
  padding: 1.5rem;
  backdrop-filter: blur(4px) saturate(180%) brightness(110%);
  -webkit-backdrop-filter: blur(4px) saturate(180%) brightness(110%);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  font-weight: 700;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}

.user-name {
  font-size: 1rem;
  font-weight: 600;
}

.user-label {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 2px;
}

.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.15);
  margin: 0.25rem 0;
}

.section-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.55);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.field input {
  width: 100%;
  padding: 0.8rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 14px;
  color: #fff;
  font-size: 0.95rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
  box-sizing: border-box;
}

.field input:focus {
  border-color: rgba(255, 255, 255, 0.75);
  background: rgba(255, 255, 255, 0.16);
}

.field input::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.msg {
  font-size: 0.85rem;
  text-align: center;
}

.error { color: #fca5a5; }
.success { color: #86efac; }

.glass-btn {
  width: 100%;
  padding: 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.45);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3);
  font-family: inherit;
}

.glass-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.glass-btn:active {
  transform: scale(0.98);
}

.glass-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.glass-btn.export {
  background: rgba(99, 179, 237, 0.15);
  border-color: rgba(99, 179, 237, 0.4);
  color: rgba(186, 230, 253, 0.9);
}

.glass-btn.export:hover {
  background: rgba(99, 179, 237, 0.25);
}

.glass-btn.danger {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.4);
  color: #fca5a5;
}

.glass-btn.danger:hover {
  background: rgba(239, 68, 68, 0.25);
}

.glass-btn.destructive {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.25);
  color: rgba(252, 165, 165, 0.7);
}

.about-card {
  gap: 0.5rem;
}

.about-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.55);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.about-text {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.5;
}

.version {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.3);
}
</style>
