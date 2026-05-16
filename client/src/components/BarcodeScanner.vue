<template>
  <div class="scanner-overlay" @click.self="$emit('close')">
    <div class="scanner-wrap">
      <div class="scanner-header">
        <span>Barcode scannen</span>
        <button type="button" class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="video-wrap" v-if="!error">
        <video ref="video" class="scanner-video" autoplay muted playsinline />
        <div class="viewfinder">
          <div class="corner tl" />
          <div class="corner tr" />
          <div class="corner bl" />
          <div class="corner br" />
        </div>
        <p class="scanner-hint">Barcode in den Rahmen halten</p>
      </div>

      <div class="scanner-error-wrap" v-else>
        <p class="scanner-error">{{ error }}</p>
        <button type="button" class="retry-btn" @click="$emit('close')">Schließen</button>
      </div>
    </div>
  </div>
</template>

<script>
import { BrowserMultiFormatReader } from '@zxing/browser'

export default {
  name: 'BarcodeScanner',
  emits: ['scan', 'close'],
  data() {
    return {
      error: '',
      stream: null,
      loopId: null,
      reader: null,
      canvas: null,
      ctx: null,
    }
  },
  async mounted() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      })
      const video = this.$refs.video
      video.srcObject = this.stream

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('timeout')), 10000)
        video.addEventListener('playing', () => { clearTimeout(timeout); resolve() }, { once: true })
        video.play().catch(reject)
      })

      this.reader = new BrowserMultiFormatReader()
      this.scheduleNextDecode()
    } catch (e) {
      if (e?.name === 'NotAllowedError') {
        this.error = 'Kamerazugriff verweigert — bitte in den Einstellungen erlauben.'
      } else {
        this.error = 'Kamera konnte nicht gestartet werden.'
      }
    }
  },
  beforeUnmount() {
    clearTimeout(this.loopId)
    this.stream?.getTracks().forEach(t => t.stop())
  },
  methods: {
    scheduleNextDecode() {
      this.loopId = setTimeout(() => this.decode(), 300)
    },
    decode() {
      const video = this.$refs.video
      if (!video || video.videoWidth === 0) {
        this.scheduleNextDecode()
        return
      }

      if (!this.canvas) {
        this.canvas = document.createElement('canvas')
        this.canvas.width = video.videoWidth
        this.canvas.height = video.videoHeight
        this.ctx = this.canvas.getContext('2d')
      }

      this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height)

      try {
        const result = this.reader.decodeFromCanvas(this.canvas)
        if (result) {
          this.$emit('scan', result.getText())
          return
        }
      } catch {
        // NotFoundException is expected — just keep looping
      }

      this.scheduleNextDecode()
    },
  },
}
</script>

<style scoped>
.scanner-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.scanner-wrap {
  width: 100%;
  max-width: 520px;
  background: #0f1f3d;
  border-radius: 24px 24px 0 0;
  padding: 1.25rem 1.25rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.scanner-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
}

.close-btn {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 8px;
  color: rgba(255,255,255,0.7);
  font-size: 0.9rem;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
  font-family: inherit;
}

.video-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 16px;
  background: #000;
}

.scanner-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.viewfinder {
  position: absolute;
  inset: 15%;
  pointer-events: none;
}

.corner {
  position: absolute;
  width: 24px;
  height: 24px;
  border-color: #fff;
  border-style: solid;
  border-width: 0;
}

.corner.tl { top: 0; left: 0;  border-top-width: 3px; border-left-width: 3px;  border-radius: 4px 0 0 0; }
.corner.tr { top: 0; right: 0; border-top-width: 3px; border-right-width: 3px; border-radius: 0 4px 0 0; }
.corner.bl { bottom: 0; left: 0;  border-bottom-width: 3px; border-left-width: 3px;  border-radius: 0 0 0 4px; }
.corner.br { bottom: 0; right: 0; border-bottom-width: 3px; border-right-width: 3px; border-radius: 0 0 4px 0; }

.scanner-hint {
  text-align: center;
  font-size: 0.82rem;
  color: rgba(255,255,255,0.5);
  margin: 0;
}

.scanner-error-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem 0;
}

.scanner-error {
  color: #fca5a5;
  font-size: 0.9rem;
  text-align: center;
}

.retry-btn {
  padding: 0.6rem 1.5rem;
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 12px;
  color: #fff;
  font-size: 0.9rem;
  cursor: pointer;
  font-family: inherit;
}
</style>
