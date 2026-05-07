<template>
  <div class="add-view">
    <header class="page-header">
      <h1>Eintrag hinzufügen</h1>
    </header>

    <div class="glass-card">
      <form @submit.prevent="submit">

        <!-- Typ -->
        <div class="field">
          <label>Typ</label>
          <div class="type-toggle">
            <button type="button" :class="['type-btn', { active: type === 'meal' }]" @click="type = 'meal'">
              🍽️ Mahlzeit
            </button>
            <button type="button" :class="['type-btn', { active: type === 'symptom' }]" @click="type = 'symptom'">
              💊 Symptom
            </button>
          </div>
        </div>

        <!-- Datum & Uhrzeit -->
        <div class="field">
          <label>Datum & Uhrzeit</label>
          <input type="datetime-local" v-model="dateTime" required />
        </div>

        <!-- === MAHLZEIT === -->
        <template v-if="type === 'meal'">

          <!-- Tageszeit -->
          <div class="field">
            <label>Tageszeit</label>
            <div class="type-toggle">
              <button type="button" :class="['type-btn', { active: mealTime === 'morning' }]" @click="mealTime = 'morning'">🌅 Morgens</button>
              <button type="button" :class="['type-btn', { active: mealTime === 'noon' }]"    @click="mealTime = 'noon'">☀️ Mittags</button>
              <button type="button" :class="['type-btn', { active: mealTime === 'evening' }]" @click="mealTime = 'evening'">🌙 Abends</button>
            </div>
          </div>

          <!-- Item-Liste -->
          <div class="items-list" v-if="items.length > 0">
            <div class="item-card" v-for="(item, idx) in items" :key="idx">
              <div class="item-header">
                <span class="item-icon">{{ item.itemType === 'food' ? '🍎' : '🥤' }}</span>
                <span class="item-name">{{ item.name }}</span>
                <button type="button" class="remove-btn" @click="removeItem(idx)">✕</button>
              </div>
              <div class="ingredient-tags" v-if="item.ingredients.length > 0">
                <span class="tag" v-for="(ing, i) in item.ingredients" :key="i">{{ ing }}</span>
              </div>
            </div>
          </div>

          <!-- Neues Item hinzufügen -->
          <div class="add-item-form" v-if="addingItemType">
            <div class="add-item-header">
              <span>{{ addingItemType === 'food' ? '🍎 Essen' : '🥤 Trinken' }} hinzufügen</span>
              <button type="button" class="remove-btn" @click="cancelAddItem">✕</button>
            </div>

            <!-- Vorschläge -->
            <div class="suggestions" v-if="filteredSuggestions.length > 0">
              <button
                type="button"
                class="suggestion-chip"
                v-for="s in filteredSuggestions"
                :key="s.id"
                @click="applySuggestion(s)"
              >
                {{ s.name }}
              </button>
            </div>

            <input
              class="item-input"
              v-model="newItemName"
              :placeholder="addingItemType === 'food' ? 'z.B. Porridge' : 'z.B. Kaffee'"
              ref="itemNameInput"
            />

            <!-- Zutaten -->
            <div class="ingredients-section">
              <label>Zutaten (optional)</label>
              <div class="ingredient-row" v-for="(ing, i) in newItemIngredients" :key="i">
                <span class="tag">{{ ing }}</span>
                <button type="button" class="remove-btn small" @click="newItemIngredients.splice(i, 1)">✕</button>
              </div>
              <div class="ingredient-input-row">
                <input
                  class="item-input"
                  v-model="newIngredient"
                  placeholder="Zutat eingeben…"
                  @keydown.enter.prevent="addIngredient"
                />
                <button type="button" class="add-ing-btn" @click="addIngredient">+</button>
              </div>
            </div>

            <button type="button" class="confirm-item-btn" @click="confirmItem" :disabled="!newItemName.trim()">
              Hinzufügen
            </button>
          </div>

          <!-- Buttons: Essen / Trinken -->
          <div class="add-item-btns" v-if="!addingItemType">
            <button type="button" class="ghost-btn" @click="startAddItem('food')">+ Essen</button>
            <button type="button" class="ghost-btn" @click="startAddItem('drink')">+ Trinken</button>
          </div>

        </template>

        <!-- === SYMPTOM === -->
        <template v-if="type === 'symptom'">

          <!-- Bereits hinzugefügte Symptome -->
          <div class="items-list" v-if="symptomItems.length > 0">
            <div class="item-card" v-for="(s, idx) in symptomItems" :key="idx">
              <div class="item-header">
                <span class="item-name">💊 {{ symptomLabel(s.symptomId) }}</span>
                <span :class="['severity-badge-sm', s.severity]">
                  {{ { mild: 'Leicht', moderate: 'Mittel', severe: 'Stark' }[s.severity] }}
                </span>
                <button type="button" class="remove-btn" @click="symptomItems.splice(idx, 1)">✕</button>
              </div>
            </div>
          </div>

          <!-- Neues Symptom hinzufügen -->
          <div class="add-item-form" v-if="addingSymptom">
            <div class="add-item-header">
              <span>Symptom hinzufügen</span>
              <button type="button" class="remove-btn" @click="addingSymptom = false">✕</button>
            </div>
            <select class="item-input" v-model="newSymptomId">
              <option value="" disabled>Symptom auswählen…</option>
              <option v-for="s in symptoms" :key="s.id" :value="s.id">{{ s.de || s.en }}</option>
            </select>
            <div class="type-toggle" style="margin-top: 0.5rem">
              <button type="button" :class="['type-btn', 'severity-mild',    { active: newSeverity === 'mild' }]"     @click="newSeverity = 'mild'">Leicht</button>
              <button type="button" :class="['type-btn', 'severity-moderate', { active: newSeverity === 'moderate' }]" @click="newSeverity = 'moderate'">Mittel</button>
              <button type="button" :class="['type-btn', 'severity-severe',   { active: newSeverity === 'severe' }]"   @click="newSeverity = 'severe'">Stark</button>
            </div>
            <button type="button" class="confirm-item-btn" @click="confirmSymptom" :disabled="!newSymptomId">
              Hinzufügen
            </button>
          </div>

          <div class="add-item-btns" v-if="!addingSymptom">
            <button type="button" class="ghost-btn" @click="addingSymptom = true; newSymptomId = ''; newSeverity = 'mild'">
              + Symptom hinzufügen
            </button>
          </div>

          <div class="field">
            <label>Beschreibung (optional)</label>
            <textarea v-model="description" placeholder="Wann begonnen? Bemerkungen…" rows="3" />
          </div>
        </template>

        <p class="msg error" v-if="error">{{ error }}</p>
        <p class="msg success" v-if="success">Gespeichert!</p>

        <button type="submit" class="submit-btn" :disabled="loading || !canSubmit">
          {{ loading ? '…' : 'Speichern' }}
        </button>

      </form>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AddEntryView',
  data() {
    return {
      type: 'meal',
      dateTime: this.nowLocal(),
      mealTime: this.guessedMealTime(),
      items: [],
      addingItemType: null,
      newItemName: '',
      newItemIngredients: [],
      newIngredient: '',
      recentItems: [],
      symptomItems: [],
      addingSymptom: false,
      newSymptomId: '',
      newSeverity: 'mild',
      description: '',
      symptoms: [],
      loading: false,
      error: '',
      success: false,
    }
  },
  computed: {
    filteredSuggestions() {
      const q = this.newItemName.trim().toLowerCase()
      return this.recentItems
        .filter(s => s.itemType === this.addingItemType)
        .filter(s => !q || s.name.toLowerCase().includes(q))
        .slice(0, 5)
    },
    canSubmit() {
      if (this.type === 'meal') return this.items.length > 0 && !this.addingItemType
      if (this.type === 'symptom') return this.symptomItems.length > 0 && !this.addingSymptom
      return false
    },
  },
  watch: {
    type() {
      this.error = ''
      this.success = false
    },
  },
  async created() {
    try {
      const [symptomsRes, recentRes] = await Promise.all([
        fetch('/api/symptoms', { credentials: 'include' }),
        fetch('/api/entries/recent-items', { credentials: 'include' }),
      ])
      this.symptoms = (await symptomsRes.json()).symptoms ?? []
      this.recentItems = (await recentRes.json()).items ?? []
    } catch {
      // Nicht kritisch — Formular funktioniert auch ohne
    }
  },
  methods: {
    nowLocal() {
      const now = new Date()
      const pad = n => String(n).padStart(2, '0')
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
    },
    guessedMealTime() {
      const h = new Date().getHours()
      if (h < 11) return 'morning'
      if (h < 16) return 'noon'
      return 'evening'
    },
    startAddItem(itemType) {
      this.addingItemType = itemType
      this.newItemName = ''
      this.newItemIngredients = []
      this.newIngredient = ''
      this.$nextTick(() => this.$refs.itemNameInput?.focus())
    },
    cancelAddItem() {
      this.addingItemType = null
    },
    confirmSymptom() {
      if (!this.newSymptomId) return
      this.symptomItems.push({ symptomId: this.newSymptomId, severity: this.newSeverity })
      this.addingSymptom = false
    },
    symptomLabel(id) {
      const s = this.symptoms.find(s => s.id === id)
      return s ? (s.de || s.en) : id
    },
    applySuggestion(suggestion) {
      this.newItemName = suggestion.name
      this.newItemIngredients = [...suggestion.ingredients]
    },
    addIngredient() {
      const ing = this.newIngredient.trim()
      if (ing) {
        this.newItemIngredients.push(ing)
        this.newIngredient = ''
      }
    },
    confirmItem() {
      if (!this.newItemName.trim()) return
      this.items.push({
        itemType: this.addingItemType,
        name: this.newItemName.trim(),
        ingredients: [...this.newItemIngredients],
      })
      this.addingItemType = null
    },
    removeItem(idx) {
      this.items.splice(idx, 1)
    },
    async submit() {
      this.error = ''
      this.success = false
      this.loading = true
      try {
        const payload = {
          type: this.type,
          dateTime: new Date(this.dateTime).toISOString(),
          ...(this.type === 'meal' && {
            mealTime: this.mealTime,
            items: this.items,
          }),
          ...(this.type === 'symptom' && {
            symptoms: this.symptomItems,
            description: this.description,
          }),
        }
        const res = await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Fehler beim Speichern')
        this.success = true
        this.items = []
        this.description = ''
        this.symptomItems = []
        this.dateTime = this.nowLocal()
        this.mealTime = this.guessedMealTime()
        setTimeout(() => this.$router.push('/log'), 800)
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
.add-view {
  padding: 1.5rem 1rem 1rem;
  max-width: 600px;
  margin: 0 auto;
}

.page-header h1 {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin-bottom: 1.25rem;
}

.glass-card {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 28px;
  padding: 1.75rem 1.5rem;
  backdrop-filter: blur(4px) saturate(180%) brightness(110%);
  -webkit-backdrop-filter: blur(4px) saturate(180%) brightness(110%);
  box-shadow: 0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.3);
}

.field {
  margin-bottom: 1.25rem;
}

.field label {
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(255,255,255,0.55);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.field input,
.field select,
.field textarea {
  width: 100%;
  padding: 0.8rem 1rem;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.4);
  border-radius: 14px;
  color: #fff;
  font-size: 0.95rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
  box-sizing: border-box;
}

.field input:focus,
.field select:focus,
.field textarea:focus {
  border-color: rgba(255,255,255,0.75);
  background: rgba(255,255,255,0.16);
}

.field select option { background: #1b2a4a; }
.field textarea { resize: vertical; min-height: 80px; }
.field input::placeholder,
.field textarea::placeholder { color: rgba(255,255,255,0.35); }
.field input[type="datetime-local"]::-webkit-calendar-picker-indicator {
  filter: invert(1) opacity(0.5);
  cursor: pointer;
}

.type-toggle {
  display: flex;
  gap: 0.5rem;
}

.type-btn {
  flex: 1;
  padding: 0.7rem 0.5rem;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.5);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.type-btn.active {
  background: rgba(255,255,255,0.22);
  border-color: rgba(255,255,255,0.65);
  color: #fff;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.3);
}

/* Items */
.items-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 1rem;
}

.item-card {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 14px;
  padding: 0.75rem 1rem;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.item-icon { font-size: 1rem; }

.item-name {
  flex: 1;
  font-size: 0.95rem;
  font-weight: 600;
}

.ingredient-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.5rem;
}

.tag {
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
  font-size: 0.78rem;
  color: rgba(255,255,255,0.75);
}

/* Add item form */
.add-item-form {
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 18px;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.add-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(255,255,255,0.7);
}

.item-input {
  width: 100%;
  padding: 0.7rem 0.9rem;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.35);
  border-radius: 12px;
  color: #fff;
  font-size: 0.95rem;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.item-input:focus { border-color: rgba(255,255,255,0.7); }
.item-input::placeholder { color: rgba(255,255,255,0.35); }

.ingredients-section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.ingredients-section label {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255,255,255,0.45);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.ingredient-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.ingredient-input-row {
  display: flex;
  gap: 0.4rem;
}

.add-ing-btn {
  padding: 0.6rem 0.9rem;
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 12px;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
  font-family: inherit;
}

.add-ing-btn:hover { background: rgba(255,255,255,0.2); }

.confirm-item-btn {
  padding: 0.7rem;
  border: 1px solid rgba(255,255,255,0.4);
  border-radius: 12px;
  background: rgba(255,255,255,0.18);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  font-family: inherit;
}

.confirm-item-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.confirm-item-btn:hover:not(:disabled) { background: rgba(255,255,255,0.26); }

/* Buttons Essen/Trinken */
.add-item-btns {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.ghost-btn {
  flex: 1;
  padding: 0.7rem;
  border: 1px dashed rgba(255,255,255,0.3);
  border-radius: 14px;
  background: transparent;
  color: rgba(255,255,255,0.55);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.ghost-btn:hover {
  border-color: rgba(255,255,255,0.6);
  color: #fff;
  background: rgba(255,255,255,0.06);
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.25rem;
}

.suggestion-chip {
  padding: 0.35rem 0.8rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.82rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}

.suggestion-chip:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.6);
  color: #fff;
}

.severity-mild.active     { background: rgba(74, 222, 128, 0.2); border-color: rgba(74, 222, 128, 0.7); color: #86efac; }
.severity-moderate.active { background: rgba(251, 191, 36, 0.2); border-color: rgba(251, 191, 36, 0.7); color: #fde68a; }
.severity-severe.active   { background: rgba(248, 113, 113, 0.2); border-color: rgba(248, 113, 113, 0.7); color: #fca5a5; }

.severity-badge-sm {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  border: 1px solid;
}
.severity-badge-sm.mild     { background: rgba(74,222,128,0.15); border-color: rgba(74,222,128,0.5); color: #86efac; }
.severity-badge-sm.moderate { background: rgba(251,191,36,0.15);  border-color: rgba(251,191,36,0.5); color: #fde68a; }
.severity-badge-sm.severe   { background: rgba(248,113,113,0.15); border-color: rgba(248,113,113,0.5); color: #fca5a5; }

.remove-btn {
  background: none;
  border: none;
  color: rgba(255,255,255,0.35);
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0.1rem 0.3rem;
  transition: color 0.2s;
  font-family: inherit;
}

.remove-btn:hover { color: #fca5a5; }
.remove-btn.small { font-size: 0.75rem; }

.msg { font-size: 0.85rem; text-align: center; margin-bottom: 0.75rem; }
.error { color: #fca5a5; }
.success { color: #86efac; }

.submit-btn {
  width: 100%;
  padding: 0.9rem;
  border: 1px solid rgba(255,255,255,0.5);
  border-radius: 14px;
  background: rgba(255,255,255,0.2);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.4);
  font-family: inherit;
}

.submit-btn:hover:not(:disabled) { background: rgba(255,255,255,0.28); }
.submit-btn:active { transform: scale(0.98); }
.submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
