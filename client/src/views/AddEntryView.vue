<template>
  <div class="add-view">
    <header class="page-header">
      <button class="back-btn" @click="$router.push('/log')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <h1>{{ editId ? 'Eintrag bearbeiten' : 'Eintrag hinzufügen' }}</h1>
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
            <button type="button" :class="['type-btn', { active: type === 'stool' }]" @click="type = 'stool'">
              🚽 Stuhl
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

            <div class="item-input-row">
              <input
                class="item-input"
                v-model="newItemName"
                :placeholder="addingItemType === 'food' ? 'z.B. Porridge' : 'z.B. Kaffee'"
                ref="itemNameInput"
              />
              <button type="button" class="scan-btn" @click="showScanner = true" title="Barcode scannen">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <rect x="2" y="2" width="5" height="5" rx="1"/><rect x="17" y="2" width="5" height="5" rx="1"/>
                  <rect x="2" y="17" width="5" height="5" rx="1"/>
                  <line x1="2" y1="9" x2="2" y2="10"/><line x1="7" y1="9" x2="7" y2="10"/>
                  <line x1="12" y1="9" x2="12" y2="9.5"/>
                  <line x1="9" y1="2" x2="9" y2="7"/><line x1="9" y1="12" x2="9" y2="12.5"/>
                  <line x1="12" y1="2" x2="12" y2="7"/>
                  <line x1="15" y1="9" x2="15" y2="12"/><line x1="17" y1="9" x2="17" y2="10"/>
                  <line x1="22" y1="9" x2="22" y2="12"/><line x1="12" y1="15" x2="12" y2="22"/>
                  <line x1="17" y1="14" x2="17" y2="14.5"/><line x1="22" y1="14" x2="22" y2="17"/>
                  <line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="22" x2="22" y2="22"/>
                  <line x1="17" y1="17" x2="17" y2="22"/>
                </svg>
              </button>
            </div>
            <p class="scan-status loading" v-if="scanLoading">Produktdaten werden geladen…</p>
            <p class="scan-status error" v-if="scanError">{{ scanError }}</p>

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

        <!-- === STUHL === -->
        <template v-if="type === 'stool'">

          <!-- BSS Slider -->
          <div class="field">
            <label>Bristol Stuhl Skala</label>
            <div class="bss-slider-wrap">
              <div class="bss-value-row">
                <span class="bss-number">Typ {{ stoolBssType }}</span>
              </div>
              <input
                type="range"
                min="1" max="7"
                v-model.number="stoolBssType"
                class="bss-slider"
              />
              <div class="bss-ticks">
                <span v-for="n in 7" :key="n" :class="{ active: stoolBssType === n }">{{ n }}</span>
              </div>
            </div>
            <div class="bss-description">
              <span class="bss-label" :class="bssInfo(stoolBssType).cls">{{ bssInfo(stoolBssType).label }}</span>
              <span class="bss-text">{{ bssInfo(stoolBssType).text }}</span>
            </div>
          </div>

          <!-- Toggles -->
          <div class="field">
            <label>Begleiterscheinungen</label>
            <div class="toggle-list">
              <button type="button" :class="['toggle-btn', { active: stoolBlood }]"   @click="stoolBlood   = !stoolBlood">
                <span class="toggle-dot blood"></span> Blut
              </button>
              <button type="button" :class="['toggle-btn', { active: stoolMucus }]"   @click="stoolMucus   = !stoolMucus">
                <span class="toggle-dot mucus"></span> Schleim
              </button>
              <button type="button" :class="['toggle-btn', { active: stoolUrgency }]" @click="stoolUrgency = !stoolUrgency">
                <span class="toggle-dot urgency"></span> Dringend
              </button>
            </div>
          </div>

          <!-- Schmerzen -->
          <div class="field">
            <label>Schmerzen</label>
            <div class="type-toggle">
              <button type="button" :class="['type-btn', 'severity-mild',     { active: stoolPain === 'none' }]"   @click="stoolPain = 'none'">Keine</button>
              <button type="button" :class="['type-btn', 'severity-moderate', { active: stoolPain === 'mild' }]"   @click="stoolPain = 'mild'">Leicht</button>
              <button type="button" :class="['type-btn', 'severity-severe',   { active: stoolPain === 'severe' }]" @click="stoolPain = 'severe'">Stark</button>
            </div>
          </div>

        </template>

        <p class="msg error" v-if="error">{{ error }}</p>
        <p class="msg success" v-if="success">Gespeichert!</p>

        <button type="submit" class="submit-btn" :disabled="loading || !canSubmit">
          {{ loading ? '…' : 'Speichern' }}
        </button>

      </form>
    </div>

    <BarcodeScanner v-if="showScanner" @scan="handleScan" @close="showScanner = false" />
  </div>
</template>

<script>
import BarcodeScanner from '../components/BarcodeScanner.vue'

export default {
  name: 'AddEntryView',
  components: { BarcodeScanner },
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
      editId: null,
      // Stuhl
      stoolBssType: 4,
      stoolBlood:   false,
      stoolMucus:   false,
      stoolUrgency: false,
      stoolPain:    'none',
      // Barcode-Scanner
      showScanner: false,
      scanLoading: false,
      scanError: '',
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
      if (this.type === 'stool') return true
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

    if (this.$route.params.id) {
      this.editId = parseInt(this.$route.params.id)
      await this.loadEntry()
    }
  },
  methods: {
    nowLocal() {
      const now = new Date()
      const pad = n => String(n).padStart(2, '0')
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
    },
    toLocalDatetime(isoStr) {
      const d = new Date(isoStr)
      const pad = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
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
    async handleScan(barcode) {
      this.showScanner = false
      this.scanLoading = true
      this.scanError = ''
      try {
        const res = await fetch(
          `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,product_name_de,ingredients_text,ingredients`
        )
        const data = await res.json()
        if (data.status !== 1) {
          this.scanError = 'Produkt nicht gefunden (Barcode: ' + barcode + ')'
          return
        }
        const p = data.product
        this.newItemName = p.product_name_de || p.product_name || ''

        if (p.ingredients && p.ingredients.length > 0) {
          this.newItemIngredients = p.ingredients
            .map(i => i.text?.replace(/_/g, '').trim())
            .filter(s => s && s.length > 1)
        } else if (p.ingredients_text) {
          this.newItemIngredients = p.ingredients_text
            .split(/,\s*/)
            .map(s => s.replace(/\s*\(.*?\)\s*/g, '').replace(/\s*\d+[,.]?\d*\s*%/g, '').trim())
            .filter(s => s.length > 1)
        }
      } catch {
        this.scanError = 'Netzwerkfehler beim Laden der Produktdaten'
      } finally {
        this.scanLoading = false
      }
    },
    async loadEntry() {
      try {
        const res = await fetch(`/api/entries/${this.editId}`, { credentials: 'include' })
        if (!res.ok) { this.$router.push('/log'); return }
        const { entry } = await res.json()

        this.type     = entry.type
        this.dateTime = this.toLocalDatetime(entry.dateTime)

        if (entry.type === 'meal') {
          this.mealTime = entry.mealTime ?? 'morning'
          this.items = (entry.items ?? []).map(item => ({
            itemType: item.itemType,
            name: item.name,
            ingredients: (item.ingredients ?? []).map(i => i.name),
          }))
        } else if (entry.type === 'symptom') {
          this.symptomItems = entry.symptoms ?? []
          this.description  = entry.description ?? ''
        } else if (entry.type === 'stool' && entry.stool) {
          this.stoolBssType = entry.stool.bssType
          this.stoolBlood   = entry.stool.blood
          this.stoolMucus   = entry.stool.mucus
          this.stoolUrgency = entry.stool.urgency
          this.stoolPain    = entry.stool.pain
        }
      } catch {
        this.$router.push('/log')
      }
    },
    bssInfo(type) {
      const map = {
        1: { label: 'Schwere Verstopfung',  cls: 'bss-bad',     text: 'Einzelne harte Klümpchen, wie Nüsse — sehr schwer auszuscheiden' },
        2: { label: 'Leichte Verstopfung',  cls: 'bss-bad',     text: 'Wurstförmig, aber klumpig' },
        3: { label: 'Normal',               cls: 'bss-ok',      text: 'Wurstförmig mit rissiger Oberfläche' },
        4: { label: 'Normal (Idealform)',   cls: 'bss-ok',      text: 'Glatt, weich, wurstförmig oder schlangenförmig' },
        5: { label: 'Zu wenig Ballaststoffe', cls: 'bss-warn', text: 'Weiche Klümpchen mit klaren Rändern — leicht auszuscheiden' },
        6: { label: 'Leichter Durchfall',   cls: 'bss-warn',    text: 'Lockere, fluffige Stücke mit ausgefransten Rändern' },
        7: { label: 'Starker Durchfall',    cls: 'bss-bad',     text: 'Wässrig, keine festen Bestandteile — vollständig flüssig' },
      }
      return map[type] ?? map[4]
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
          ...(this.type === 'stool' && {
            stool: {
              bssType: this.stoolBssType,
              blood:   this.stoolBlood,
              mucus:   this.stoolMucus,
              urgency: this.stoolUrgency,
              pain:    this.stoolPain,
            },
          }),
        }
        const url    = this.editId ? `/api/entries/${this.editId}` : '/api/entries'
        const method = this.editId ? 'PUT' : 'POST'
        const res = await fetch(url, {
          method,
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
        this.stoolBssType = 4
        this.stoolBlood   = false
        this.stoolMucus   = false
        this.stoolUrgency = false
        this.stoolPain    = 'none'
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

.page-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.page-header h1 {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.back-btn {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 10px;
  padding: 0.4rem;
  cursor: pointer;
  color: #fff;
  display: flex;
  align-items: center;
  transition: background 0.2s;
  flex-shrink: 0;
}

.back-btn:hover { background: rgba(255,255,255,0.18); }
.back-btn svg { width: 20px; height: 20px; }

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

.item-input-row {
  display: flex;
  gap: 0.4rem;
}

.item-input-row .item-input {
  flex: 1;
}

.scan-btn {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.35);
  border-radius: 12px;
  color: rgba(255,255,255,0.75);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  padding: 0;
}

.scan-btn:hover {
  background: rgba(255,255,255,0.2);
  color: #fff;
}

.scan-btn svg {
  width: 20px;
  height: 20px;
}

.scan-status {
  font-size: 0.8rem;
  margin: 0;
}

.scan-status.loading { color: rgba(255,255,255,0.55); }
.scan-status.error   { color: #fca5a5; }

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

/* ── BSS Slider ── */
.bss-slider-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bss-value-row {
  display: flex;
  justify-content: center;
}

.bss-number {
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
}

.bss-slider {
  width: 100%;
  accent-color: rgba(255,255,255,0.8);
  height: 6px;
  cursor: pointer;
}

.bss-ticks {
  display: flex;
  justify-content: space-between;
  padding: 0 2px;
}

.bss-ticks span {
  font-size: 0.72rem;
  color: rgba(255,255,255,0.35);
  transition: color 0.15s;
}

.bss-ticks span.active {
  color: #fff;
  font-weight: 700;
}

.bss-description {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 12px;
}

.bss-label {
  font-size: 0.85rem;
  font-weight: 700;
}

.bss-label.bss-ok   { color: #86efac; }
.bss-label.bss-warn { color: #fde68a; }
.bss-label.bss-bad  { color: #fca5a5; }

.bss-text {
  font-size: 0.82rem;
  color: rgba(255,255,255,0.6);
  line-height: 1.4;
}

/* ── Toggle-Buttons ── */
.toggle-list {
  display: flex;
  gap: 0.5rem;
}

.toggle-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.65rem 0.5rem;
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

.toggle-btn.active {
  background: rgba(255,255,255,0.18);
  border-color: rgba(255,255,255,0.6);
  color: #fff;
}

.toggle-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.toggle-dot.blood   { background: #fca5a5; }
.toggle-dot.mucus   { background: #fde68a; }
.toggle-dot.urgency { background: #93c5fd; }
</style>
