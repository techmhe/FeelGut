<template>
  <div class="export-view">
    <header class="page-header">
      <button class="back-btn" @click="$router.push('/settings')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <h1>Export</h1>
    </header>

    <div class="glass-card">

      <!-- Format -->
      <div class="field">
        <label>Format</label>
        <div class="type-toggle">
          <button type="button" :class="['type-btn', { active: format === 'csv' }]" @click="format = 'csv'">
            CSV
          </button>
          <button type="button" :class="['type-btn', { active: format === 'pdf' }]" @click="format = 'pdf'">
            PDF
          </button>
        </div>
      </div>

      <!-- Zeitraum -->
      <div class="field">
        <label>Zeitraum</label>
        <div class="range-grid">
          <button
            type="button"
            v-for="r in ranges"
            :key="r.value"
            :class="['range-btn', { active: range === r.value }]"
            @click="range = r.value"
          >{{ r.label }}</button>
        </div>
      </div>

      <!-- Benutzerdefiniert -->
      <template v-if="range === 'custom'">
        <div class="field">
          <label>Von</label>
          <input type="date" v-model="customFrom" />
        </div>
        <div class="field">
          <label>Bis</label>
          <input type="date" v-model="customTo" />
        </div>
      </template>

      <p class="entry-count" v-if="!loading">
        {{ filteredEntries.length }} Einträge im gewählten Zeitraum
      </p>
      <p class="entry-count" v-else>Laden…</p>

      <button
        class="submit-btn"
        @click="doExport"
        :disabled="loading || filteredEntries.length === 0"
      >
        Als {{ format.toUpperCase() }} exportieren
      </button>

    </div>
  </div>
</template>

<script>
import jsPDF from 'jspdf'

export default {
  name: 'ExportView',
  data() {
    return {
      format: 'pdf',
      range: 'all',
      customFrom: '',
      customTo: '',
      entries: [],
      symptoms: [],
      loading: false,
      ranges: [
        { value: 'all',   label: 'Alle' },
        { value: 'today', label: 'Heute' },
        { value: 'week',  label: 'Letzte Woche' },
        { value: 'month', label: 'Letzter Monat' },
        { value: 'custom', label: 'Benutzerdefiniert' },
      ],
    }
  },
  computed: {
    filteredEntries() {
      const now = new Date()
      let from = null
      let to = null

      if (this.range === 'today') {
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
        to   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      } else if (this.range === 'week') {
        from = new Date(now)
        from.setDate(from.getDate() - 7)
      } else if (this.range === 'month') {
        from = new Date(now)
        from.setMonth(from.getMonth() - 1)
      } else if (this.range === 'custom') {
        if (this.customFrom) from = new Date(this.customFrom)
        if (this.customTo) {
          to = new Date(this.customTo)
          to.setHours(23, 59, 59, 999)
        }
      }

      return this.entries.filter(e => {
        const d = new Date(e.dateTime)
        const dLocal = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes())
        if (from && dLocal < from) return false
        if (to   && dLocal > to)   return false
        return true
      })
    },
  },
  async created() {
    this.loading = true
    try {
      const [entriesRes, symptomsRes] = await Promise.all([
        fetch('/api/entries', { credentials: 'include' }),
        fetch('/api/symptoms', { credentials: 'include' }),
      ])
      this.entries = (await entriesRes.json()).entries ?? []
      this.symptoms = (await symptomsRes.json()).symptoms ?? []
    } catch {
      // Fehler ignorieren
    } finally {
      this.loading = false
    }
  },
  methods: {
    symptomName(id) {
      return this.symptoms.find(s => s.id === id)?.de || id
    },
    mealTimeLabel(mt) {
      return { morning: 'Morgens', noon: 'Mittags', evening: 'Abends' }[mt] ?? ''
    },
    doExport() {
      if (this.format === 'csv') this.exportCSV()
      else this.exportPDF()
    },

    // ── CSV ──────────────────────────────────────────────
    exportCSV() {
      const severityLabel = { mild: 'Leicht', moderate: 'Mittel', severe: 'Stark' }
      const rows = [
        ['Datum', 'Uhrzeit', 'Typ', 'Tageszeit', 'Kategorie', 'Name', 'Zutaten', 'Symptom', 'Schweregrad', 'Beschreibung'],
      ]

      for (const entry of this.filteredEntries) {
        const d = new Date(entry.dateTime)
        const date = d.toLocaleDateString('de-DE')
        const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

        if (entry.type === 'meal') {
          for (const item of entry.items ?? []) {
            rows.push([
              date, time, 'Mahlzeit', this.mealTimeLabel(entry.mealTime),
              item.itemType === 'food' ? 'Essen' : 'Trinken',
              item.name,
              (item.ingredients ?? []).map(i => i.name).join('; '),
              '', '', '',
            ])
          }
        } else {
          for (const s of entry.symptoms ?? []) {
            rows.push([
              date, time, 'Symptom', '', '', '', '',
              this.symptomName(s.symptomId),
              severityLabel[s.severity] ?? '',
              entry.description ?? '',
            ])
          }
        }
      }

      const csv = '\ufeff' + rows
        .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      this.download(
        new Blob([csv], { type: 'text/csv;charset=utf-8' }),
        `feelgut-${this.rangeSlug()}.csv`,
      )
    },

    // ── PDF ──────────────────────────────────────────────
    exportPDF() {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const W = doc.internal.pageSize.getWidth()
      const ML = 14         // margin left/right
      const usable = W - ML * 2
      let y = ML

      // Spaltenbreiten: Uhrzeit | Tageszeit | Art | Inhalt
      const COL = [18, 24, 32, usable - 18 - 24 - 32]
      const COL_X = [ML, ML + COL[0], ML + COL[0] + COL[1], ML + COL[0] + COL[1] + COL[2]]
      const PAD = 1.8       // cell padding top/bottom
      const LH = 4.5        // line height

      const newPage = () => { doc.addPage(); y = ML }
      const checkY = (h) => { if (y + h > 283) newPage() }

      // Dokument-Header
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('FeelGut — Gesundheitsprotokoll', ML, y)
      y += 6
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(130)
      doc.text(
        `Exportiert am ${new Date().toLocaleDateString('de-DE')}  |  Zeitraum: ${this.rangeLabel()}`,
        ML, y,
      )
      y += 2
      doc.setDrawColor(130)
      doc.line(ML, y, W - ML, y)
      y += 7
      doc.setTextColor(0)

      // Tabellenkopf zeichnen
      const drawTableHead = () => {
        const headers = ['Uhrzeit', 'Tageszeit', 'Art', 'Inhalt']
        doc.setFillColor(230, 232, 240)
        doc.rect(ML, y, usable, LH + PAD * 2, 'F')
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(60)
        headers.forEach((h, i) => doc.text(h, COL_X[i] + PAD, y + PAD + LH - 1))
        doc.setTextColor(0)
        y += LH + PAD * 2
      }

      // Zeile zeichnen — gibt Zeilenhöhe zurück
      const drawRow = (time, mealTime, art, contentLines, shade) => {
        const rowH = Math.max(contentLines.length, 1) * LH + PAD * 2
        checkY(rowH)
        if (shade) {
          doc.setFillColor(247, 248, 252)
          doc.rect(ML, y, usable, rowH, 'F')
        }
        doc.setDrawColor(210)
        doc.line(ML, y + rowH, W - ML, y + rowH)

        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(40)

        const textY = y + PAD + LH - 1
        doc.text(time,     COL_X[0] + PAD, textY)
        doc.text(mealTime, COL_X[1] + PAD, textY)

        // Art — farbig
        if (art === 'Symptom') doc.setTextColor(180, 40, 40)
        else doc.setTextColor(40, 110, 60)
        doc.text(art, COL_X[2] + PAD, textY)
        doc.setTextColor(40)

        // Inhalt — mehrzeilig
        contentLines.forEach((line, li) => {
          doc.text(line, COL_X[3] + PAD, textY + li * LH)
        })

        y += rowH
      }

      // Einträge nach Tag gruppieren (neueste zuerst → umdrehen für chronologisch)
      const byDay = {}
      for (const entry of [...this.filteredEntries].reverse()) {
        const key = new Date(entry.dateTime).toLocaleDateString('de-DE', {
          weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
        })
        if (!byDay[key]) byDay[key] = []
        byDay[key].push(entry)
      }

      const contentMaxW = COL[3] - PAD * 2
      const wrapLine = (text) => {
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'normal')
        return doc.splitTextToSize(text, contentMaxW)
      }

      let shade = false

      for (const [day, dayEntries] of Object.entries(byDay)) {
        checkY(22)

        // Tag-Header
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(20)
        doc.text(day, ML, y)
        y += 1.5
        doc.setDrawColor(60)
        doc.line(ML, y, W - ML, y)
        y += 4

        drawTableHead()
        shade = false

        for (const entry of dayEntries) {
          const time = new Date(entry.dateTime).toLocaleTimeString('de-DE', {
            hour: '2-digit', minute: '2-digit',
          })

          if (entry.type === 'meal') {
            const contentLines = []
            for (const item of entry.items ?? []) {
              const prefix = item.itemType === 'food' ? 'Essen: ' : 'Trinken: '
              contentLines.push(...wrapLine(prefix + item.name))
              for (const ing of item.ingredients ?? []) {
                contentLines.push(...wrapLine('  · ' + ing.name))
              }
            }
            drawRow(time, this.mealTimeLabel(entry.mealTime), 'Lebensmittel', contentLines, shade)
          } else {
            const sevLabel = { mild: 'Leicht', moderate: 'Mittel', severe: 'Stark' }
            const contentLines = []
            for (const s of entry.symptoms ?? []) {
              const sev = sevLabel[s.severity] ? ` (${sevLabel[s.severity]})` : ''
              contentLines.push(...wrapLine(this.symptomName(s.symptomId) + sev))
            }
            if (entry.description) contentLines.push(...wrapLine(entry.description))
            drawRow(time, '', 'Symptom', contentLines, shade)
          }

          shade = !shade
        }

        y += 8
      }

      doc.save(`feelgut-${this.rangeSlug()}.pdf`)
    },

    rangeLabel() {
      const labels = { all: 'Alle Einträge', today: 'Heute', week: 'Letzte Woche', month: 'Letzter Monat', custom: 'Benutzerdefiniert' }
      return labels[this.range] ?? ''
    },

    rangeSlug() {
      return `${this.range}-${new Date().toISOString().slice(0, 10)}`
    },

    download(blob, filename) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    },
  },
}
</script>

<style scoped>
.export-view {
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
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  padding: 0.4rem;
  cursor: pointer;
  color: #fff;
  display: flex;
  align-items: center;
  transition: background 0.2s;
}

.back-btn:hover { background: rgba(255, 255, 255, 0.18); }

.back-btn svg { width: 20px; height: 20px; }

.glass-card {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 28px;
  padding: 1.75rem 1.5rem;
  backdrop-filter: blur(4px) saturate(180%) brightness(110%);
  -webkit-backdrop-filter: blur(4px) saturate(180%) brightness(110%);
  box-shadow: 0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.3);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.field { display: flex; flex-direction: column; gap: 0.5rem; }

.field label {
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(255,255,255,0.55);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.field input[type="date"] {
  padding: 0.8rem 1rem;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.4);
  border-radius: 14px;
  color: #fff;
  font-size: 0.95rem;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
}

.field input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(1) opacity(0.5);
  cursor: pointer;
}

.type-toggle {
  display: flex;
  gap: 0.5rem;
}

.type-btn {
  flex: 1;
  padding: 0.7rem;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.5);
  font-size: 0.9rem;
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

.range-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.range-btn {
  padding: 0.65rem 0.5rem;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.5);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.range-btn.active {
  background: rgba(255,255,255,0.22);
  border-color: rgba(255,255,255,0.65);
  color: #fff;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.3);
}

.entry-count {
  font-size: 0.85rem;
  color: rgba(255,255,255,0.45);
  text-align: center;
}

.submit-btn {
  width: 100%;
  padding: 0.9rem;
  border: 1px solid rgba(255,255,255,0.5);
  border-radius: 14px;
  background: rgba(255,255,255,0.2);
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
