<template>
  <div id="app">
    <RouterView />
    <nav class="bottom-nav" v-if="showNav">
      <RouterLink to="/log" class="nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <span>Log</span>
      </RouterLink>
      <RouterLink to="/add" class="nav-item nav-item--add">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </RouterLink>
      <RouterLink to="/settings" class="nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="8" r="4"/>
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
        </svg>
        <span>Konto</span>
      </RouterLink>
    </nav>
  </div>
</template>

<script>
export default {
  name: 'App',
  computed: {
    showNav() {
      return this.$route.path !== '/login'
    },
  },
}
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: linear-gradient(135deg, #0d1b2a 0%, #1b2a4a 50%, #0d2137 100%);
  min-height: 100dvh;
  color: #fff;
}

#app {
  min-height: 100dvh;
  padding-bottom: 80px;
}

a {
  text-decoration: none;
  color: inherit;
}
</style>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 100;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.7rem;
  font-weight: 500;
  transition: color 0.2s;
  padding: 0.5rem 1.5rem;
}

.nav-item svg {
  width: 24px;
  height: 24px;
}

.nav-item.router-link-active {
  color: #fff;
}

.nav-item--add {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
  padding: 0;
  color: #fff;
  justify-content: center;
  gap: 0;
}

.nav-item--add svg {
  width: 22px;
  height: 22px;
}

.nav-item--add.router-link-active {
  background: rgba(255, 255, 255, 0.3);
}
</style>
