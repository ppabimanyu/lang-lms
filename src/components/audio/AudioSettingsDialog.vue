<script setup lang="ts">
import {
  SUPPORTED_LANGUAGES,
  globalTargetLanguage,
  speechRate,
  isSpeaking,
  testVoice,
  stopSpeech
} from '@/lib/tts'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Volume2,
  VolumeX,
  Languages,
  Gauge,
  Check
} from '@lucide/vue'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const speedOptions = [
  { value: 0.75, label: '0.75x', desc: 'Lambat (Pemula)' },
  { value: 0.85, label: '0.85x', desc: 'Nyaman (Rekomendasi)' },
  { value: 1.0, label: '1.0x', desc: 'Normal (Penutur Asli)' },
]

function handleSelectLanguage(code: string) {
  globalTargetLanguage.value = code
  testVoice(code)
}

function handleSelectSpeed(speed: number) {
  speechRate.value = speed
  testVoice()
}

function handleTestVoice() {
  if (isSpeaking.value) {
    stopSpeech()
  } else {
    testVoice()
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(val: boolean) => emit('update:open', val)">
    <DialogContent class="sm:max-w-md max-h-[90vh] overflow-y-auto">
      <DialogHeader class="space-y-1">
        <div class="flex items-center gap-2 text-primary font-semibold text-xs tracking-wide uppercase">
          <Languages class="w-4 h-4" />
          <span>Pengaturan Suara & Aksen</span>
        </div>
        <DialogTitle class="text-xl font-bold">Aksen & Pelafalan Suara (TTS)</DialogTitle>
        <DialogDescription class="text-xs leading-relaxed">
          Pilih bahasa target dan kecepatan bicara yang sesuai dengan kenyamanan belajar Anda.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-5 py-2">
        <!-- 1. Language & Accent Selection -->
        <div class="space-y-2.5">
          <label class="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>Bahasa & Aksen Target:</span>
            <span class="text-[11px] font-normal text-muted-foreground font-mono">
              Aktif: {{ globalTargetLanguage }}
            </span>
          </label>

          <div class="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            <button
              v-for="lang in SUPPORTED_LANGUAGES"
              :key="lang.code"
              type="button"
              @click="handleSelectLanguage(lang.code)"
              :class="[
                'p-2.5 rounded-xl border text-left transition-all flex items-center justify-between group cursor-pointer',
                globalTargetLanguage === lang.code
                  ? 'border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary'
                  : 'border-border bg-card hover:bg-muted/60 text-foreground'
              ]"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="text-lg shrink-0">{{ lang.flag }}</span>
                <div class="truncate">
                  <div class="text-xs font-bold truncate">{{ lang.name }}</div>
                  <div class="text-[10px] text-muted-foreground truncate">{{ lang.nativeName }}</div>
                </div>
              </div>

              <Check
                v-if="globalTargetLanguage === lang.code"
                class="w-4 h-4 text-primary shrink-0"
              />
            </button>
          </div>
        </div>

        <Separator />

        <!-- 2. Speech Rate Selection -->
        <div class="space-y-2.5">
          <label class="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Gauge class="w-3.5 h-3.5 text-primary" />
            <span>Kecepatan Bicara (Speech Rate):</span>
          </label>

          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="opt in speedOptions"
              :key="opt.value"
              type="button"
              @click="handleSelectSpeed(opt.value)"
              :class="[
                'p-2.5 rounded-xl border text-center transition-all cursor-pointer',
                speechRate === opt.value
                  ? 'border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary font-bold'
                  : 'border-border bg-card hover:bg-muted/60 text-foreground'
              ]"
            >
              <div class="text-xs font-bold">{{ opt.label }}</div>
              <div class="text-[10px] text-muted-foreground">{{ opt.desc }}</div>
            </button>
          </div>
        </div>

        <!-- 3. Test Audio Button Banner -->
        <div class="p-3.5 rounded-xl bg-muted/60 border border-border/80 flex items-center justify-between gap-3">
          <div class="text-xs space-y-0.5">
            <div class="font-semibold text-foreground">Uji Coba Pelafalan</div>
            <div class="text-[11px] text-muted-foreground">Dengarkan sampel aksen suara aktif</div>
          </div>

          <Button
            size="sm"
            variant="outline"
            class="h-8 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10"
            @click="handleTestVoice"
          >
            <VolumeX v-if="isSpeaking" class="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            <Volume2 v-else class="w-3.5 h-3.5" />
            <span>{{ isSpeaking ? 'Hentikan' : 'Coba Suara' }}</span>
          </Button>
        </div>
      </div>

      <DialogFooter class="sm:justify-end pt-2 border-t border-border">
        <Button size="sm" @click="emit('update:open', false)">
          Simpan & Tutup
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
