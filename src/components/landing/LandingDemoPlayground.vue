<script setup lang="ts">
import { ref } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { speak as speakText, isSpeaking, SUPPORTED_LANGUAGES } from '@/lib/tts'
import {
  Volume2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Zap,
  Gauge
} from '@lucide/vue'

const activeSampleLang = ref(SUPPORTED_LANGUAGES[0]) // German default
const ttsSpeed = ref<number>(0.85)

const demoQuizSelectedOption = ref<string | null>(null)
const demoQuizIsCorrect = ref<boolean | null>(null)

function playLanguageSample(lang: typeof SUPPORTED_LANGUAGES[0]) {
  activeSampleLang.value = lang
  speakText(lang.samplePhrase, lang.code, ttsSpeed.value)
}

function checkDemoAnswer(option: string) {
  demoQuizSelectedOption.value = option
  demoQuizIsCorrect.value = option === 'der'
}

function resetDemoQuiz() {
  demoQuizSelectedOption.value = null
  demoQuizIsCorrect.value = null
}
</script>

<template>
  <section id="demo" class="py-18 md:py-26 bg-muted/30 border-y border-border/60 relative overflow-hidden">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <!-- Section Header -->
      <div class="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
        <Badge variant="outline" class="mb-3 px-3.5 py-1 font-semibold border-primary/30 text-primary bg-primary/5">
          <Sparkles class="size-3.5 mr-1 text-primary" />
          Fitur Interaktif Langsung
        </Badge>
        <h2 class="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Rasakan Pengalaman Belajar Sebelum Mendaftar
        </h2>
        <p class="mt-4 text-muted-foreground text-sm sm:text-base leading-relaxed">
          Uji langsung pelafalan penutur asli untuk 11 bahasa dunia dan coba jawab contoh soal kuis interaktif di bawah ini tanpa perlu login.
        </p>
      </div>

      <!-- Playground Dual Panel Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-6xl mx-auto">
        <!-- Left Panel: Interactive Audio TTS Showcase -->
        <div class="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div class="rounded-2xl border border-border/80 bg-card p-6 shadow-sm flex-1 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-4 pb-3 border-b border-border/60">
                <div class="flex items-center gap-2">
                  <div class="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Volume2 class="size-4" />
                  </div>
                  <span class="font-bold text-sm text-foreground">Audio Penutur Asli (TTS)</span>
                </div>
                <span class="text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border/60">
                  Web Speech API
                </span>
              </div>

              <!-- Speed Controller Controls -->
              <div class="flex items-center justify-between text-xs mb-3.5 px-1 text-muted-foreground">
                <div class="flex items-center gap-1.5 font-medium">
                  <Gauge class="size-3.5 text-primary" />
                  <span>Kecepatan Suara:</span>
                </div>
                <div class="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/60">
                  <button
                    v-for="s in [0.75, 0.85, 1.0]"
                    :key="s"
                    @click="ttsSpeed = s"
                    :class="[
                      'px-2 py-0.5 rounded-md text-[11px] font-mono font-medium transition-colors',
                      ttsSpeed === s
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    ]"
                  >
                    {{ s }}x
                  </button>
                </div>
              </div>

              <!-- Language Selection Grid -->
              <div class="grid grid-cols-2 gap-2 mb-4">
                <button
                  v-for="lang in SUPPORTED_LANGUAGES.slice(0, 6)"
                  :key="lang.code"
                  @click="playLanguageSample(lang)"
                  :class="[
                    'flex items-center gap-2.5 p-2.5 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer group',
                    activeSampleLang.code === lang.code
                      ? 'border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30'
                      : 'border-border/60 hover:border-border hover:bg-muted/50 text-foreground'
                  ]"
                >
                  <span class="text-xl leading-none group-hover:scale-110 transition-transform">{{ lang.flag }}</span>
                  <div class="truncate">
                    <div class="font-bold leading-tight">{{ lang.name }}</div>
                    <div class="text-[10px] text-muted-foreground truncate">{{ lang.nativeName }}</div>
                  </div>
                </button>
              </div>
            </div>

            <!-- Active Audio Phrase Player Card -->
            <div class="p-4 rounded-xl bg-muted/50 border border-border/70 flex items-center justify-between gap-3 mt-2">
              <div class="truncate">
                <div class="text-[11px] text-muted-foreground font-medium">
                  Contoh Kalimat ({{ activeSampleLang.name }}):
                </div>
                <div class="text-xs sm:text-sm font-bold text-foreground truncate mt-0.5">
                  "{{ activeSampleLang.samplePhrase }}"
                </div>
              </div>
              <Button
                size="sm"
                @click="playLanguageSample(activeSampleLang)"
                class="size-9 p-0 rounded-full shrink-0 shadow-sm gap-0 cursor-pointer"
                :disabled="isSpeaking"
                :title="'Dengarkan contoh ' + activeSampleLang.name"
              >
                <Volume2 :class="['size-4', isSpeaking && 'animate-ping']" />
              </Button>
            </div>
          </div>

          <!-- Highlight Helper Callout -->
          <div class="p-4 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground flex items-start gap-3 backdrop-blur-xs">
            <Zap class="size-4 text-primary shrink-0 mt-0.5" />
            <span>
              Tersedia <strong>11 Bahasa Dunia</strong> (Jerman, Spanyol, Prancis, Jepang, dll.) yang terintegrasi di setiap modul bacaan dan kuis untuk melatih pendengaran telinga secara bertahap.
            </span>
          </div>
        </div>

        <!-- Right Panel: Interactive Question Preview Card -->
        <div class="lg:col-span-7 flex flex-col justify-between">
          <div class="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-lg shadow-black/5 flex-1 flex flex-col justify-between">
            <div>
              <!-- Mockup Question Top Bar -->
              <div class="flex items-center justify-between border-b border-border/60 pb-4 mb-6">
                <div class="flex items-center gap-2.5">
                  <Badge variant="secondary" class="text-xs font-mono font-semibold px-2.5 py-0.5 bg-primary/10 text-primary border border-primary/20">
                    Kuis Mini • Jerman A1
                  </Badge>
                  <span class="text-xs text-muted-foreground hidden sm:inline">• Pilihan Ganda Rumpang</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  @click="speakText('Das ist ein Tisch.', 'de-DE', 0.85)"
                  class="h-8 px-2.5 text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/10 cursor-pointer"
                >
                  <Volume2 class="size-3.5" />
                  <span>Dengar Pelafalan</span>
                </Button>
              </div>

              <!-- Question Prompt & Context -->
              <div class="space-y-2.5 mb-7">
                <div class="text-xs text-muted-foreground font-medium">Lengkapi kata sandang rumpang berikut:</div>
                <div class="text-2xl sm:text-3xl font-extrabold text-foreground font-mono tracking-wide">
                  Das ist <span class="text-primary underline decoration-dashed underline-offset-8 decoration-2 font-black px-1">
                    {{ demoQuizSelectedOption || '_____' }}
                  </span> Tisch.
                </div>
                <div class="text-xs text-muted-foreground italic bg-muted/40 p-2.5 rounded-lg border border-border/50">
                  💡 <strong>Petunjuk:</strong> "Itu adalah meja." Dalam bahasa Jerman, kata benda <em>Tisch</em> (meja) ber-gender maskulin.
                </div>
              </div>

              <!-- Clickable Answer Options -->
              <div class="grid grid-cols-3 gap-3 mb-6">
                <button
                  v-for="opt in ['der', 'die', 'das']"
                  :key="opt"
                  @click="checkDemoAnswer(opt)"
                  :class="[
                    'py-3.5 px-4 rounded-xl font-mono font-bold text-base border transition-all text-center cursor-pointer shadow-2xs',
                    demoQuizSelectedOption === opt
                      ? opt === 'der'
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/30'
                        : 'border-destructive bg-destructive/15 text-destructive ring-2 ring-destructive/30'
                      : 'border-border/80 hover:border-primary/50 hover:bg-muted/60 text-foreground'
                  ]"
                >
                  {{ opt }}
                </button>
              </div>
            </div>

            <!-- Result Feedback Notification -->
            <div>
              <div
                v-if="demoQuizSelectedOption"
                class="p-4 rounded-xl text-xs sm:text-sm flex items-center justify-between gap-3 animate-in fade-in duration-200"
                :class="[
                  demoQuizIsCorrect
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-destructive/10 border border-destructive/30 text-destructive'
                ]"
              >
                <div class="flex items-center gap-2.5">
                  <CheckCircle2 v-if="demoQuizIsCorrect" class="size-5 shrink-0 text-emerald-500" />
                  <XCircle v-else class="size-5 shrink-0 text-destructive" />
                  <div>
                    <span v-if="demoQuizIsCorrect" class="font-bold">
                      Hebat! Jawaban benar: "der Tisch" (+10 XP)
                    </span>
                    <span v-else class="font-medium">
                      Kurang tepat. Benda "Tisch" ber-gender maskulin (der). Coba ulangi lagi!
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  @click="resetDemoQuiz"
                  class="h-7 px-2.5 text-xs gap-1 shrink-0 cursor-pointer"
                >
                  <RotateCcw class="size-3" />
                  <span>Ulangi</span>
                </Button>
              </div>

              <div v-else class="text-xs text-muted-foreground text-center py-2.5 flex items-center justify-center gap-1.5">
                <span>👆</span>
                <span>Pilih salah satu jawaban di atas untuk melihat respon instan dan skor.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
