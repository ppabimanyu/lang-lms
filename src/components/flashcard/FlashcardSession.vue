<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import confetti from 'canvas-confetti'
import type { Question, CourseFlashcard } from '@/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { speak, isSpeaking } from '@/lib/tts'
import { isFeatureEnabled } from '@/lib/featureFlags'
import { api } from '@/lib/api'
import {
  Volume2,
  RotateCw,
  Shuffle,
  Trophy,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Flame,
  Layers,
  Keyboard
} from '@lucide/vue'

interface FlashcardItem {
  id: string
  front: string
  back: string
  hint?: string
  explanation?: string
  targetText: string // The text in target language for TTS
  status: 'unseen' | 'hard' | 'good' | 'easy'
  reviewCount: number
}

const props = withDefaults(
  defineProps<{
    cards?: CourseFlashcard[]
    questions?: Question[]
    targetLanguage: string
    courseTitle: string
    courseId: string
  }>(),
  {
    cards: () => [],
    questions: () => [],
  }
)

const emit = defineEmits<{
  (e: 'goToQuiz'): void
  (e: 'xpAwarded', xp: number): void
}>()

// Deck configuration
const isReverseMode = ref(false) // If true: Indonesian on front, Target Language on back
const isAutoAudio = ref(false) // Auto-play pronunciation when card is shown

// Session State
const initialCards = ref<FlashcardItem[]>([])
const activeQueue = ref<FlashcardItem[]>([])
const recycleQueue = ref<FlashcardItem[]>([])
const masteredList = ref<FlashcardItem[]>([])
const currentIndex = ref(0)
const isFlipped = ref(false)
const isSessionFinished = ref(false)
const roundNumber = ref(1)
const isRecyclingRound = ref(false)

// Session Stats
const sessionStartTime = ref<number>(Date.now())
const timeSpentSeconds = ref(0)
const firstTryMasteredCount = ref(0)
const xpEarned = ref(0)
const isSavingProgress = ref(false)

// Storage Key for Local Progress
const storageKey = computed(() => `lingua_flashcard_mastery_${props.courseId}`)

// Current Card
const currentCard = computed<FlashcardItem | null>(() => {
  if (currentIndex.value < activeQueue.value.length) {
    return activeQueue.value[currentIndex.value]
  }
  return null
})

// Progress Metrics
const totalUniqueCards = computed(() => initialCards.value.length)
const totalMasteredCount = computed(() => masteredList.value.length)
const progressPercentage = computed(() => {
  if (totalUniqueCards.value === 0) return 0
  return Math.min(100, Math.round((totalMasteredCount.value / totalUniqueCards.value) * 100))
})

// Initialize cards from dedicated course flashcards
function initCards() {
  const sourceCards = (props.cards && props.cards.length > 0)
    ? props.cards
    : (props.questions && props.questions.length > 0
        ? props.questions.map(q => ({
            id: q.id,
            front: q.question,
            back: q.translation || q.answer,
            hint: undefined,
            explanation: q.explanation,
          }))
        : [])

  if (sourceCards.length === 0) {
    initialCards.value = []
    activeQueue.value = []
    return
  }

  const items: FlashcardItem[] = sourceCards.map((c, idx) => {
    let frontText = c.front.trim()
    let backText = c.back.trim()

    // If reverse mode is active: swap front and back
    if (isReverseMode.value) {
      const temp = frontText
      frontText = backText
      backText = temp
    }

    return {
      id: c.id || `card-${idx}`,
      front: frontText,
      back: backText,
      hint: c.hint,
      explanation: c.explanation,
      targetText: c.front.trim(), // Always speak the target language word
      status: 'unseen',
      reviewCount: 0
    }
  })

  initialCards.value = [...items]
  resetSession()
}

function resetSession() {
  activeQueue.value = [...initialCards.value]
  recycleQueue.value = []
  masteredList.value = []
  currentIndex.value = 0
  isFlipped.value = false
  isSessionFinished.value = false
  roundNumber.value = 1
  isRecyclingRound.value = false
  firstTryMasteredCount.value = 0
  xpEarned.value = 0
  sessionStartTime.value = Date.now()

  if (isAutoAudio.value && currentCard.value) {
    playCurrentAudio()
  }
}

function shuffleDeck() {
  // Fisher-Yates shuffle
  const arr = [...activeQueue.value]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  activeQueue.value = arr
  currentIndex.value = 0
  isFlipped.value = false
  if (isAutoAudio.value && currentCard.value) {
    playCurrentAudio()
  }
}

function flipCard() {
  isFlipped.value = !isFlipped.value
  if (isFlipped.value && isAutoAudio.value && currentCard.value) {
    playCurrentAudio()
  }
}

function playCurrentAudio() {
  if (!currentCard.value || !isFeatureEnabled('enable_tts')) return
  speak(currentCard.value.targetText, props.targetLanguage, 0.85)
}

// Spaced Repetition Rating Action
async function handleRating(rating: 'hard' | 'good' | 'easy') {
  if (!currentCard.value) return

  const card = currentCard.value
  card.reviewCount++

  if (rating === 'hard') {
    // Belum Hafal: masukkan ke recycle queue untuk putaran selanjutnya
    card.status = 'hard'
    recycleQueue.value.push(card)
  } else if (rating === 'good') {
    // Ragu-ragu: tandai good, masukkan ke mastered list tapi tidak dihitung full first-try
    card.status = 'good'
    masteredList.value.push(card)
  } else if (rating === 'easy') {
    // Sudah Hafal: tandai mudah & mastered
    card.status = 'easy'
    if (roundNumber.value === 1) {
      firstTryMasteredCount.value++
    }
    masteredList.value.push(card)
  }

  isFlipped.value = false

  // Advance to next card in active queue
  if (currentIndex.value + 1 < activeQueue.value.length) {
    currentIndex.value++
    if (isAutoAudio.value && currentCard.value) {
      setTimeout(() => playCurrentAudio(), 150)
    }
  } else {
    // End of current active queue!
    handleQueueExhausted()
  }
}

function handleQueueExhausted() {
  if (recycleQueue.value.length > 0) {
    // Masih ada kartu yang belum hafal: daur ulang ke putaran berikutnya
    isRecyclingRound.value = true
    roundNumber.value++
    activeQueue.value = [...recycleQueue.value]
    recycleQueue.value = []
    currentIndex.value = 0

    setTimeout(() => {
      isRecyclingRound.value = false
      if (isAutoAudio.value && currentCard.value) {
        playCurrentAudio()
      }
    }, 1200)
  } else {
    // Semua kartu telah tuntas dihafal!
    finishSession()
  }
}

async function finishSession() {
  isSessionFinished.value = true
  timeSpentSeconds.value = Math.max(1, Math.round((Date.now() - sessionStartTime.value) / 1000))

  // Calculate XP reward: base 15 XP + 2 XP per unique mastered card (max 35 XP)
  const earned = Math.min(35, 15 + totalUniqueCards.value * 2)
  xpEarned.value = earned

  // Trigger celebration confetti
  confetti({
    particleCount: 100,
    spread: 80,
    origin: { y: 0.6 }
  })

  // Save mastery to localStorage
  try {
    const masteryData = {
      courseId: props.courseId,
      completedAt: new Date().toISOString(),
      totalCards: totalUniqueCards.value,
      masteredCount: totalMasteredCount.value,
      xpEarned: earned
    }
    localStorage.setItem(storageKey.value, JSON.stringify(masteryData))
  } catch (err) {
    console.warn('Gagal menyimpan riwayat flashcard lokal:', err)
  }

  // Sync XP to server studyStats
  isSavingProgress.value = true
  try {
    await api.courses.recordProgress(props.courseId, {
      courseTitle: props.courseTitle,
      ...({
        flashcardResult: {
          totalCards: totalUniqueCards.value,
          masteredCount: totalMasteredCount.value,
          xpEarned: earned
        }
      } as any)
    })
    emit('xpAwarded', earned)
  } catch (err) {
    console.error('Gagal mencatat XP hafalan ke backend:', err)
  } finally {
    isSavingProgress.value = false
  }
}

// Keyboard navigation
function handleKeyDown(e: KeyboardEvent) {
  if (isSessionFinished.value) return

  // Prevent when user is typing in inputs or textareas
  const target = e.target as HTMLElement
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
    return
  }

  if (e.code === 'Space' || e.key === 'Enter') {
    e.preventDefault()
    flipCard()
  } else if (e.key === '1') {
    if (isFlipped.value) {
      e.preventDefault()
      handleRating('hard')
    }
  } else if (e.key === '2') {
    if (isFlipped.value) {
      e.preventDefault()
      handleRating('good')
    }
  } else if (e.key === '3') {
    if (isFlipped.value) {
      e.preventDefault()
      handleRating('easy')
    }
  } else if (e.key.toLowerCase() === 'a') {
    e.preventDefault()
    playCurrentAudio()
  }
}

watch(
  [() => props.cards, () => props.questions],
  () => {
    initCards()
  },
  { deep: true, immediate: true }
)

watch(isReverseMode, () => {
  initCards()
})

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div class="space-y-6 max-w-3xl mx-auto font-sans">
    <!-- Top Toolbar: Controls, Progress & Toggles -->
    <div class="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border border-border/80 bg-card shadow-xs">
      <!-- Left: Counter & Mastery Percentage -->
      <div class="flex items-center gap-2.5">
        <div class="size-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <Layers class="size-5" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-foreground font-mono">
              Kartu {{ currentIndex + 1 }} / {{ activeQueue.length }}
            </span>
            <Badge v-if="roundNumber > 1" variant="outline" class="text-[10px] px-1.5 py-0 font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
              Putaran {{ roundNumber }} (Daur Ulang)
            </Badge>
          </div>
          <div class="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <span>{{ totalMasteredCount }} dari {{ totalUniqueCards }} dikuasai</span>
            <span class="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">({{ progressPercentage }}%)</span>
          </div>
        </div>
      </div>

      <!-- Right: Action Buttons & Settings -->
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Reverse Mode Toggle -->
        <Button
          variant="outline"
          size="sm"
          class="h-8 text-xs gap-1.5 cursor-pointer"
          :class="isReverseMode ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' : 'text-muted-foreground'"
          @click="isReverseMode = !isReverseMode"
          title="Balik arah hafalan (Target -> Indonesia atau Indonesia -> Target)"
        >
          <RotateCw class="size-3.5" />
          <span class="hidden sm:inline">{{ isReverseMode ? 'ID → Target' : 'Target → ID' }}</span>
        </Button>

        <!-- Shuffle Button -->
        <Button
          variant="outline"
          size="sm"
          class="h-8 text-xs gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
          @click="shuffleDeck"
          title="Acak urutan kartu"
        >
          <Shuffle class="size-3.5" />
          <span class="hidden sm:inline">Acak</span>
        </Button>

        <!-- Auto Audio Toggle -->
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/60 bg-muted/40 text-[11px] text-muted-foreground">
          <Volume2 class="size-3.5" :class="isAutoAudio ? 'text-indigo-600 dark:text-indigo-400' : 'text-muted-foreground'" />
          <span class="hidden md:inline">Auto Suara:</span>
          <Switch
            :checked="isAutoAudio"
            @update:checked="isAutoAudio = $event"
            class="scale-75 origin-right cursor-pointer"
          />
        </div>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="w-full h-2 bg-muted rounded-full overflow-hidden shadow-2xs">
      <div
        class="h-full bg-linear-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-300 ease-out"
        :style="{ width: `${progressPercentage}%` }"
      />
    </div>

    <!-- RECYCLING ROUND NOTICE -->
    <div
      v-if="isRecyclingRound"
      class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-center space-y-1 animate-in zoom-in-95 duration-200"
    >
      <div class="font-bold text-xs flex items-center justify-center gap-1.5">
        <RotateCw class="size-4 animate-spin text-amber-600" />
        <span>Memulai Putaran Daur Ulang #{{ roundNumber }}</span>
      </div>
      <p class="text-[11px] text-muted-foreground">
        Melatih kembali kartu yang sebelumnya Anda tandai 'Belum Hafal' hingga berhasil dikuasai!
      </p>
    </div>

    <!-- ACTIVE CARD STUDY VIEW (If not finished) -->
    <div v-if="!isSessionFinished && currentCard" class="space-y-6">
      <!-- 3D FLIP CARD CONTAINER -->
      <div class="flashcard-scene" @click="flipCard">
        <div
          class="flashcard-card cursor-pointer select-none"
          :class="{ 'is-flipped': isFlipped }"
        >
          <!-- SISI DEPAN (FRONT) -->
          <div class="flashcard-face flashcard-front p-8 sm:p-12 flex flex-col justify-between items-center text-center">
            <!-- Top Card Header: Badge & Audio Button -->
            <div class="w-full flex items-center justify-between">
              <Badge variant="outline" class="text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20">
                {{ isReverseMode ? 'Arti Bahasa Indonesia' : 'Kosakata Bahasa Target' }}
              </Badge>
              <button
                v-if="isFeatureEnabled('enable_tts')"
                type="button"
                @click.stop="playCurrentAudio"
                class="size-9 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90"
                :disabled="isSpeaking"
                title="Dengarkan pelafalan audio"
              >
                <Volume2 class="size-4.5" :class="{ 'animate-pulse text-indigo-500': isSpeaking }" />
              </button>
            </div>

            <!-- Main Term / Prompt -->
            <div class="my-auto py-8 space-y-3">
              <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-snug">
                {{ currentCard.front }}
              </h2>
              <div v-if="currentCard.hint" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 text-xs font-medium max-w-md mx-auto">
                <HelpCircle class="size-3.5 shrink-0" />
                <span>Petunjuk: {{ currentCard.hint }}</span>
              </div>
              <p v-else class="text-xs text-muted-foreground">
                Coba ingat arti atau padanan kata ini sebelum membalik kartu.
              </p>
            </div>

            <!-- Flip Hint Footer -->
            <div class="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground/80 font-medium">
              <RotateCw class="size-3.5" />
              <span>Ketuk untuk membalik kartu (atau tekan <kbd class="px-1.5 py-0.5 rounded bg-muted border border-border/80 font-mono text-[10px]">Spasi</kbd>)</span>
            </div>
          </div>

          <!-- SISI BELAKANG (BACK) -->
          <div class="flashcard-face flashcard-back p-8 sm:p-12 flex flex-col justify-between items-center text-center">
            <!-- Top Card Header: Header & Audio -->
            <div class="w-full flex items-center justify-between">
              <Badge variant="outline" class="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
                Terjemahan & Arti
              </Badge>
              <button
                v-if="isFeatureEnabled('enable_tts')"
                type="button"
                @click.stop="playCurrentAudio"
                class="size-9 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90"
                :disabled="isSpeaking"
                title="Dengarkan pelafalan audio"
              >
                <Volume2 class="size-4.5" :class="{ 'animate-pulse text-emerald-500': isSpeaking }" />
              </button>
            </div>

            <!-- Main Answer / Definition -->
            <div class="my-auto py-6 space-y-3">
              <div class="text-xs font-mono text-muted-foreground uppercase">
                {{ currentCard.front }}
              </div>
              <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 leading-snug">
                {{ currentCard.back }}
              </h2>
              <div
                v-if="currentCard.explanation"
                class="mt-3 p-3 rounded-xl bg-muted/60 border border-border/60 text-xs text-foreground/80 leading-relaxed max-w-md mx-auto"
              >
                <span class="font-semibold text-foreground">Keterangan:</span> {{ currentCard.explanation }}
              </div>
            </div>

            <!-- Feedback Instruction Hint -->
            <div class="w-full text-xs text-muted-foreground font-medium">
              Bagaimana ingatan Anda terhadap kata ini? Pilih tombol penilaian di bawah.
            </div>
          </div>
        </div>
      </div>

      <!-- SPACED REPETITION INTERACTION BUTTONS (3-LEVEL) -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <!-- 1. BELUM HAFAL (RED) -->
        <Button
          variant="outline"
          class="h-auto py-3 px-4 rounded-xl border-rose-500/40 hover:border-rose-500 hover:bg-rose-500/10 text-rose-700 dark:text-rose-400 flex flex-col items-center gap-1 cursor-pointer transition-all active:scale-98"
          @click="handleRating('hard')"
          :disabled="!isFlipped"
          :title="!isFlipped ? 'Balik kartu terlebih dahulu untuk menilai' : 'Ulangi di akhir sesi'"
        >
          <div class="flex items-center gap-1.5 font-bold text-xs">
            <AlertCircle class="size-4 shrink-0 text-rose-600" />
            <span>Belum Hafal</span>
            <kbd class="ml-1 px-1 rounded bg-rose-500/20 text-[10px] font-mono">1</kbd>
          </div>
          <span class="text-[10px] text-muted-foreground">Ulangi lagi di putaran ini</span>
        </Button>

        <!-- 2. RAGU-RAGU (AMBER) -->
        <Button
          variant="outline"
          class="h-auto py-3 px-4 rounded-xl border-amber-500/40 hover:border-amber-500 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400 flex flex-col items-center gap-1 cursor-pointer transition-all active:scale-98"
          @click="handleRating('good')"
          :disabled="!isFlipped"
          :title="!isFlipped ? 'Balik kartu terlebih dahulu untuk menilai' : 'Ingat samar-samar'"
        >
          <div class="flex items-center gap-1.5 font-bold text-xs">
            <HelpCircle class="size-4 shrink-0 text-amber-600" />
            <span>Ragu-ragu</span>
            <kbd class="ml-1 px-1 rounded bg-amber-500/20 text-[10px] font-mono">2</kbd>
          </div>
          <span class="text-[10px] text-muted-foreground">Perlu latihan berkala</span>
        </Button>

        <!-- 3. SUDAH HAFAL (EMERALD) -->
        <Button
          variant="outline"
          class="h-auto py-3 px-4 rounded-xl border-emerald-500/40 hover:border-emerald-500 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex flex-col items-center gap-1 cursor-pointer transition-all active:scale-98"
          @click="handleRating('easy')"
          :disabled="!isFlipped"
          :title="!isFlipped ? 'Balik kartu terlebih dahulu untuk menilai' : 'Sudah hafal dengan baik'"
        >
          <div class="flex items-center gap-1.5 font-bold text-xs">
            <CheckCircle2 class="size-4 shrink-0 text-emerald-600" />
            <span>Sudah Hafal</span>
            <kbd class="ml-1 px-1 rounded bg-emerald-500/20 text-[10px] font-mono">3</kbd>
          </div>
          <span class="text-[10px] text-muted-foreground">Dikuasai dengan baik!</span>
        </Button>
      </div>

      <!-- Quick Keyboard Shortcuts Reference Strip -->
      <div class="flex items-center justify-center gap-4 text-[11px] text-muted-foreground/70 pt-1">
        <div class="flex items-center gap-1">
          <Keyboard class="size-3.5" />
          <span>Pintasan:</span>
        </div>
        <div class="flex items-center gap-1">
          <kbd class="px-1 py-0.5 rounded bg-muted border border-border/80 font-mono text-[10px]">Spasi</kbd>
          <span>Balik</span>
        </div>
        <div class="flex items-center gap-1">
          <kbd class="px-1 py-0.5 rounded bg-muted border border-border/80 font-mono text-[10px]">1, 2, 3</kbd>
          <span>Nilai</span>
        </div>
        <div class="flex items-center gap-1">
          <kbd class="px-1 py-0.5 rounded bg-muted border border-border/80 font-mono text-[10px]">A</kbd>
          <span>Audio</span>
        </div>
      </div>
    </div>

    <!-- SESSION COMPLETED / MASTERY SUMMARY SCREEN -->
    <Card
      v-else-if="isSessionFinished"
      class="border-border/80 bg-card p-6 sm:p-10 text-center space-y-6 shadow-sm animate-in fade-in-50 zoom-in-95 duration-300"
    >
      <!-- Celebration Icon -->
      <div class="size-20 rounded-3xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
        <Trophy class="size-10" />
      </div>

      <div class="space-y-1.5 max-w-md mx-auto">
        <h2 class="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          Luar Biasa, Sesi Selesai!
        </h2>
        <p class="text-xs text-muted-foreground leading-relaxed">
          Seluruh kosakata pada kursus <span class="font-semibold text-foreground">"{{ courseTitle }}"</span> telah berhasil Anda pelajari dan latih hingga tuntas.
        </p>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto">
        <div class="p-3.5 rounded-xl border border-border/80 bg-background/60">
          <div class="text-[11px] text-muted-foreground">Total Kartu</div>
          <div class="text-xl font-bold font-mono text-foreground mt-0.5">{{ totalUniqueCards }}</div>
        </div>

        <div class="p-3.5 rounded-xl border border-border/80 bg-background/60">
          <div class="text-[11px] text-muted-foreground">Penguasaan</div>
          <div class="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">100%</div>
        </div>

        <div class="p-3.5 rounded-xl border border-border/80 bg-background/60">
          <div class="text-[11px] text-muted-foreground">Bonus XP</div>
          <div class="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 flex items-center justify-center gap-1">
            <Flame class="size-4" />
            +{{ xpEarned }}
          </div>
        </div>

        <div class="p-3.5 rounded-xl border border-border/80 bg-background/60">
          <div class="text-[11px] text-muted-foreground">Putaran Sesi</div>
          <div class="text-xl font-bold font-mono text-foreground mt-0.5">{{ roundNumber }}</div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Button
          variant="outline"
          size="lg"
          class="w-full sm:w-auto text-xs font-semibold gap-2 h-11 cursor-pointer"
          @click="resetSession"
        >
          <RotateCw class="size-4" />
          <span>Ulangi Sesi Hafalan</span>
        </Button>

        <Button
          size="lg"
          class="w-full sm:w-auto text-xs font-semibold gap-2 h-11 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-md shadow-emerald-600/20"
          @click="emit('goToQuiz')"
        >
          <span>Lanjut ke Latihan Soal Kuis</span>
          <ArrowRight class="size-4" />
        </Button>
      </div>
    </Card>

    <!-- Empty State (No questions/vocabulary available) -->
    <div v-else class="py-16 text-center text-muted-foreground text-xs space-y-3">
      <div class="size-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
        <Layers class="size-6" />
      </div>
      <p>Belum ada daftar kartu kosakata pada kursus ini.</p>
    </div>
  </div>
</template>

<style scoped>
/* 3D Flip Card Effect */
.flashcard-scene {
  perspective: 1200px;
  width: 100%;
}

.flashcard-card {
  position: relative;
  width: 100%;
  min-height: 340px;
  transform-style: preserve-3d;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 1.25rem;
}

.flashcard-card.is-flipped {
  transform: rotateY(180deg);
}

.flashcard-face {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: 1.25rem;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.flashcard-front {
  background-color: var(--card);
  border: 1px solid var(--border);
  color: var(--card-foreground);
}

.flashcard-front:hover {
  border-color: rgba(99, 102, 241, 0.4);
  box-shadow: 0 8px 28px -4px rgba(99, 102, 241, 0.12);
}

.flashcard-back {
  background-color: var(--card);
  border: 1px solid rgba(16, 185, 129, 0.35);
  color: var(--card-foreground);
  transform: rotateY(180deg);
}

.flashcard-back:hover {
  border-color: rgba(16, 185, 129, 0.55);
  box-shadow: 0 8px 28px -4px rgba(16, 185, 129, 0.15);
}
</style>
