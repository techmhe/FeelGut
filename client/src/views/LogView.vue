<template>
  <div class="log-view">
    <header class="page-header">
      <h1>Mein Tagebuch</h1>
    </header>

    <div class="filter-bar">
      <button
        v-for="f in filters"
        :key="f.value"
        :class="['filter-btn', { active: activeFilter === f.value }]"
        @click="activeFilter = f.value"
      >
        {{ f.label }}
      </button>
    </div>

    <div class="search-wrap">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
      <input
        v-model="searchQuery"
        class="search-input"
        type="search"
        placeholder="Suchen…"
      />
      <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">✕</button>
    </div>

    <div class="entries-list" v-if="filteredEntries.length > 0">
      <div class="day-group" v-for="group in groupedEntries" :key="group.date">
        <div class="day-header-wrap">
          <span class="day-header">{{ group.date }}</span>
          <span class="day-summary">
            <span v-if="group.meals">{{ group.meals }} {{ group.meals === 1 ? 'Mahlzeit' : 'Mahlzeiten' }}</span>
            <span v-if="group.meals && (group.symptoms || group.stools)" class="dot">·</span>
            <span v-if="group.symptoms">{{ group.symptoms }} {{ group.symptoms === 1 ? 'Symptom' : 'Symptome' }}</span>
            <span v-if="group.symptoms && group.stools" class="dot">·</span>
            <span v-if="group.stools">{{ group.stools }} {{ group.stools === 1 ? 'Stuhlgang' : 'Stuhlgänge' }}</span>
          </span>
        </div>

        <div class="day-entries">
          <div
            v-for="entry in group.entries"
            :key="entry.id"
            :class="['entry-card', entry.type]"
          >
            <div class="entry-top">
              <span class="entry-badge">
                {{ entry.type === 'meal' ? mealTimeLabel(entry.mealTime) : entry.type === 'stool' ? '🚽 Stuhl' : '💊 Symptom' }}
              </span>
              <span class="entry-date">{{ formatDate(entry.dateTime) }}</span>
              <div class="action-btns">
                <button class="edit-btn" @click="$router.push('/edit/' + entry.id)" aria-label="Bearbeiten">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button class="delete-btn" @click="deleteEntry(entry.id)" aria-label="Löschen">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14H6L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Mahlzeit: Items mit Zutaten -->
            <template v-if="entry.type === 'meal' && entry.items">
              <div class="meal-item" v-for="item in entry.items" :key="item.id">
                <span class="meal-item-name">
                  {{ item.itemType === 'food' ? '🍎' : '🥤' }} {{ item.name }}
                </span>
                <div class="ingredient-tags" v-if="item.ingredients && item.ingredients.length > 0">
                  <span class="tag" v-for="ing in item.ingredients" :key="ing.id">{{ ing.name }}</span>
                </div>
              </div>
            </template>

            <!-- Symptom -->
            <template v-if="entry.type === 'symptom'">
              <div class="symptom-row" v-for="s in entry.symptoms" :key="s.id">
                <p class="entry-name">{{ symptomName(s.symptomId) }}</p>
                <span v-if="s.severity" :class="['severity-badge', s.severity]">
                  {{ { mild: 'Leicht', moderate: 'Mittel', severe: 'Stark' }[s.severity] }}
                </span>
              </div>
              <p class="entry-desc" v-if="entry.description">{{ entry.description }}</p>
            </template>

            <!-- Stuhl -->
            <template v-if="entry.type === 'stool' && entry.stool">
              <div class="stool-row">
                <span class="bss-badge" :class="bssCls(entry.stool.bssType)">Typ {{ entry.stool.bssType }}</span>
                <span class="stool-tag blood"   v-if="entry.stool.blood">Blut</span>
                <span class="stool-tag mucus"   v-if="entry.stool.mucus">Schleim</span>
                <span class="stool-tag urgency" v-if="entry.stool.urgency">Dringend</span>
                <span class="stool-tag pain"    v-if="entry.stool.pain !== 'none'">
                  {{ entry.stool.pain === 'mild' ? 'Leichte Schmerzen' : 'Starke Schmerzen' }}
                </span>
              </div>
              <p class="bss-desc-text">{{ bssLabel(entry.stool.bssType) }}</p>
            </template>

          </div>
        </div>
      </div>
    </div>

    <div class="empty-state" v-else-if="!loading">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
      </svg>
      <p>{{ searchQuery ? 'Keine Einträge gefunden.' : 'Noch keine Einträge. Fang an deine Gesundheit zu tracken!' }}</p>
    </div>

    <div class="loading" v-if="loading">Laden…</div>
  </div>
</template>

<script>
export default {
  name: 'LogView',
  data() {
    return {
      entries: [],
      symptoms: [],
      loading: false,
      activeFilter: 'all',
      searchQuery: '',
      filters: [
        { value: 'all', label: 'Alle' },
        { value: 'meal', label: '🍽️ Mahlzeiten' },
        { value: 'symptom', label: '💊 Symptome' },
        { value: 'stool', label: '🚽 Stuhl' },
      ],
    }
  },
  computed: {
    filteredEntries() {
      let result = this.activeFilter === 'all' ? this.entries : this.entries.filter(e => e.type === this.activeFilter)
      const q = this.searchQuery.trim().toLowerCase()
      if (!q) return result
      return result.filter(entry => {
        if (entry.type === 'meal' && entry.items) {
          return entry.items.some(item =>
            item.name.toLowerCase().includes(q) ||
            (item.ingredients && item.ingredients.some(ing => ing.name.toLowerCase().includes(q)))
          )
        }
        if (entry.type === 'symptom' && entry.symptoms) {
          return entry.symptoms.some(s => this.symptomName(s.symptomId).toLowerCase().includes(q))
        }
        if (entry.type === 'stool') {
          return ['stuhl', 'blut', 'schleim', 'dringend', 'schmerz'].some(t => t.includes(q))
        }
        return false
      })
    },
    groupedEntries() {
      const groups = []
      let currentKey = null
      for (const entry of this.filteredEntries) {
        const d = new Date(entry.dateTime)
        const key = d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
        if (key !== currentKey) {
          groups.push({ date: key, entries: [], meals: 0, symptoms: 0, stools: 0 })
          currentKey = key
        }
        const g = groups[groups.length - 1]
        g.entries.push(entry)
        if (entry.type === 'meal') g.meals++
        else if (entry.type === 'symptom') g.symptoms++
        else if (entry.type === 'stool') g.stools++
      }
      return groups
    },
  },
  async created() {
    await Promise.all([this.loadEntries(), this.loadSymptoms()])
  },
  methods: {
    async loadSymptoms() {
      try {
        const res = await fetch('/api/symptoms', { credentials: 'include' })
        const data = await res.json()
        this.symptoms = data.symptoms ?? []
      } catch {
        // Symptome nicht geladen
      }
    },
    symptomName(id) {
      const s = this.symptoms.find(s => s.id === id)
      return s ? (s.de || s.en) : id
    },
    bssLabel(type) {
      return {
        1: 'Einzelne harte Klümpchen — schwere Verstopfung',
        2: 'Wurstförmig, klumpig — leichte Verstopfung',
        3: 'Wurstförmig mit Rissen — normal',
        4: 'Glatt und weich — Idealform',
        5: 'Weiche Klümpchen — zu wenig Ballaststoffe',
        6: 'Lockere Stücke — leichter Durchfall',
        7: 'Wässrig, keine festen Teile — starker Durchfall',
      }[type] ?? ''
    },
    bssCls(type) {
      if (type <= 2 || type === 7) return 'bss-bad'
      if (type >= 5) return 'bss-warn'
      return 'bss-ok'
    },
    mealTimeLabel(mealTime) {
      return { morning: '🌅 Morgens', noon: '☀️ Mittags', evening: '🌙 Abends' }[mealTime] ?? '🍽️ Mahlzeit'
    },
    async loadEntries() {
      this.loading = true
      try {
        const res = await fetch('/api/entries', { credentials: 'include' })
        const data = await res.json()
        this.entries = data.entries ?? []
      } catch {
        // Netzwerkfehler — Einträge bleiben leer
      } finally {
        this.loading = false
      }
    },
    async deleteEntry(id) {
      if (!confirm('Eintrag wirklich löschen?')) return
      try {
        await fetch(`/api/entries/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        })
        this.entries = this.entries.filter(e => e.id !== id)
      } catch {
        // Fehler ignorieren
      }
    },
    formatDate(iso) {
      const d = new Date(iso)
      return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr'
    },
  },
}
</script>

<style scoped>
.log-view {
  padding: 1.5rem 1rem 1rem;
  max-width: 600px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 1.25rem;
}

.page-header h1 {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.filter-bar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 0.45rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.filter-btn.active {
  background: rgba(255, 255, 255, 0.22);
  border-color: rgba(255, 255, 255, 0.65);
  color: #fff;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

/* ── Suchfeld ── */
.search-wrap {
  position: relative;
  margin-bottom: 1.25rem;
}

.search-icon {
  position: absolute;
  left: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: rgba(255, 255, 255, 0.35);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.7rem 2.5rem 0.7rem 2.5rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 14px;
  color: #fff;
  font-size: 0.9rem;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s, background 0.2s;
}

.search-input:focus {
  border-color: rgba(255, 255, 255, 0.55);
  background: rgba(255, 255, 255, 0.12);
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.search-input::-webkit-search-cancel-button { display: none; }

.search-clear {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.35);
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0.2rem;
  line-height: 1;
  transition: color 0.2s;
}

.search-clear:hover { color: rgba(255, 255, 255, 0.7); }

/* ── Tag-Gruppen ── */
.entries-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.day-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.day-header-wrap {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  padding: 0.35rem 0.25rem;
  background: linear-gradient(to bottom, rgba(15, 10, 30, 0.85) 70%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.day-header {
  font-size: 0.78rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.55);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.day-summary {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.3);
  display: flex;
  gap: 0.3rem;
  align-items: center;
}

.day-summary .dot {
  color: rgba(255, 255, 255, 0.2);
}

.day-entries {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.entry-card {
  position: relative;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 20px;
  padding: 1rem 1.1rem;
  backdrop-filter: blur(4px) saturate(180%) brightness(110%);
  -webkit-backdrop-filter: blur(4px) saturate(180%) brightness(110%);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  overflow: hidden;
}

/* farbiger linker Akzent-Streifen */
.entry-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  border-radius: 20px 0 0 20px;
}

.entry-card.meal::before {
  background: linear-gradient(180deg, #4ade80, #22c55e);
}

.entry-card.symptom::before {
  background: linear-gradient(180deg, #f87171, #ef4444);
}

.entry-card.stool::before {
  background: linear-gradient(180deg, #a78bfa, #7c3aed);
}

.entry-top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.entry-badge {
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.75);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.entry-date {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.meal-item {
  margin-top: 0.4rem;
}

.meal-item-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: #fff;
}

.ingredient-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.35rem;
}

.tag {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.65);
}

.symptom-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.2rem;
}

.severity-badge {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  border: 1px solid;
}

.severity-badge.mild     { background: rgba(74,222,128,0.15); border-color: rgba(74,222,128,0.5); color: #86efac; }
.severity-badge.moderate { background: rgba(251,191,36,0.15);  border-color: rgba(251,191,36,0.5); color: #fde68a; }
.severity-badge.severe   { background: rgba(248,113,113,0.15); border-color: rgba(248,113,113,0.5); color: #fca5a5; }

.entry-name {
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 0.2rem;
}

.entry-desc {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.4;
}

.action-btns {
  display: flex;
  gap: 0.25rem;
  margin-left: auto;
  flex-shrink: 0;
}

.edit-btn,
.delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.3);
  padding: 0.2rem;
  transition: color 0.2s;
}

.edit-btn:hover   { color: rgba(147, 197, 253, 0.9); }
.delete-btn:hover { color: rgba(248, 113, 113, 0.8); }

.edit-btn svg,
.delete-btn svg {
  width: 16px;
  height: 16px;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: rgba(255, 255, 255, 0.4);
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state p {
  font-size: 0.95rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.4);
}

/* ── Stuhl-Karte ── */
.stool-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.4rem;
}

.bss-badge {
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.18rem 0.6rem;
  border-radius: 999px;
  border: 1px solid;
}

.bss-badge.bss-ok   { background: rgba(74,222,128,0.15); border-color: rgba(74,222,128,0.5); color: #86efac; }
.bss-badge.bss-warn { background: rgba(251,191,36,0.15);  border-color: rgba(251,191,36,0.5); color: #fde68a; }
.bss-badge.bss-bad  { background: rgba(248,113,113,0.15); border-color: rgba(248,113,113,0.5); color: #fca5a5; }

.stool-tag {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.18rem 0.6rem;
  border-radius: 999px;
  border: 1px solid;
}

.stool-tag.blood   { background: rgba(248,113,113,0.15); border-color: rgba(248,113,113,0.4); color: #fca5a5; }
.stool-tag.mucus   { background: rgba(251,191,36,0.15);  border-color: rgba(251,191,36,0.4); color: #fde68a; }
.stool-tag.urgency { background: rgba(147,197,253,0.15); border-color: rgba(147,197,253,0.4); color: #93c5fd; }
.stool-tag.pain    { background: rgba(167,139,250,0.15); border-color: rgba(167,139,250,0.4); color: #c4b5fd; }

.bss-desc-text {
  font-size: 0.8rem;
  color: rgba(255,255,255,0.5);
  line-height: 1.3;
}
</style>
