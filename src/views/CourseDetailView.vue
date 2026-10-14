<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  activeCourse,
  currentUser,
  activeTab,
  toggleCourseBookmark,
  openCourse,
  openUserProfile,
  selectedChapterId,
  isExamActive,
} from '@/lib/storage'
import { api } from '@/lib/api'
import type { Question, CourseChapter, CourseReview } from '@/types'
import { speak, findLanguageInfo } from '@/lib/tts'
import { isFeatureEnabled } from '@/lib/featureFlags'
import confetti from 'canvas-confetti'
import CertificateModal from '@/components/certificate/CertificateModal.vue'
import SentenceBuilder from '@/components/quiz/SentenceBuilder.vue'
import FlashcardSession from '@/components/flashcard/FlashcardSession.vue'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { parseMarkdownLesson } from '@/lib/markdown-parser'
import {
  ArrowLeft,
  BookOpen,
  Sparkles,
  Star,
  Bookmark,
  Award,
  CheckCircle2,
  Volume2,
  Clock,
  RotateCcw,
  Send,
  Timer,
  Loader2,
  Check,
  ShieldCheck,
  Lock,
  ArrowRight,
  Layers,
  HelpCircle,
  PlayCircle,
  AlertCircle,
  ChevronRight,
  ArrowUp,
  ListOrdered,
} from '@lucide/vue'

// --- General State ---
const isTogglingBookmark = ref(false)
const isCertificateOpen = ref(false)
const reviews = ref<CourseReview[]>([])
const isLoadingReviews = ref(false)
const newReviewRating = ref(5)
const newReviewComment = ref('')
const isSubmittingReview = ref(false)

// --- Chapter Study Room State ---
const activeChapterTab = ref<'markdown' | 'flashcards' | 'quiz'>('markdown')
const activeChapterData = ref<CourseChapter | null>(null)
const isLoadingChapter = ref(false)
const isMarkingRead = ref(false)

// Chapter Quiz State
const chapterQuizAnswers = ref<Record<string, string>>({})
const chapterQuizSubmitted = ref(false)
const chapterQuizScore = ref(0)
const chapterQuizAccuracy = ref(0)
const isSubmittingChapterQuiz = ref(false)
const chapterQuizTimeLeft = ref(300)
let chapterQuizTimerInterval: any = null

// Reading controls
const readingSize = ref<'sm' | 'base' | 'lg'>('base')
const readingFont = ref<'sans' | 'serif'>('sans')
const readingProgressPercent = ref(0)
const activeHeadingId = ref<string>('')

function scrollToTopOfLesson() {
  const mainEl = document.getElementById('app-main-scroll')
  if (mainEl) {
    mainEl.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function scrollToHeading(id: string) {
  activeHeadingId.value = id
  const target = document.getElementById(id)
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function handleMarkdownClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  if (!target) return

  // 1. Text to Speech Trigger
  const speakBtn = target.closest('[data-speak]') as HTMLElement | null
  if (speakBtn) {
    event.preventDefault()
    event.stopPropagation()
    const text = decodeURIComponent(speakBtn.getAttribute('data-speak') || '')
    if (text) {
      speakBtn.classList.add('is-speaking')
      speak(text, activeCourse.value?.targetLanguage || 'de-DE').finally(() => {
        speakBtn.classList.remove('is-speaking')
      })
    }
    return
  }

  // 2. Copy Code Trigger
  const copyBtn = target.closest('[data-copy]') as HTMLElement | null
  if (copyBtn) {
    event.preventDefault()
    event.stopPropagation()
    const code = decodeURIComponent(copyBtn.getAttribute('data-copy') || '')
    if (code) {
      navigator.clipboard.writeText(code).then(() => {
        const textSpan = copyBtn.querySelector('.copy-text')
        if (textSpan) {
          const original = textSpan.textContent
          textSpan.textContent = 'Tersalin! ✓'
          copyBtn.classList.add('text-emerald-500', 'font-bold')
          setTimeout(() => {
            textSpan.textContent = original
            copyBtn.classList.remove('text-emerald-500', 'font-bold')
          }, 2000)
        }
      })
    }
    return
  }
}

function updateReadingScrollProgress() {
  const scrollEl = document.getElementById('app-main-scroll') || document.documentElement
  const scrollTop = scrollEl.scrollTop
  const scrollHeight = scrollEl.scrollHeight - scrollEl.clientHeight
  if (scrollHeight > 0) {
    const pct = Math.min(100, Math.max(0, Math.round((scrollTop / scrollHeight) * 100)))
    readingProgressPercent.value = pct
  }
}

// --- Final Exam Room State ---
const examQuestions = ref<Question[]>([])
const examAnswers = ref<Record<string, string>>({})
const examCurrentIndex = ref(0)
const examTimeLeftSeconds = ref(900)
const examIsSubmitting = ref(false)
const examResult = ref<{
  isPassed: boolean
  score: number
  accuracy: number
  correctCount: number
  totalQuestions: number
  passingScore: number
  xpEarned: number
  certificateId: string | null
  breakdown: any[]
} | null>(null)
let examTimerInterval: any = null

function getAuthorInitial(name?: string): string {
  if (!name) return 'L'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Markdown parser computed
const parsedMarkdownData = computed(() => {
  if (!activeChapterData.value?.markdownContent) {
    return { html: '', headings: [], readingTimeMinutes: 1 }
  }
  return parseMarkdownLesson(activeChapterData.value.markdownContent)
})

// Course Graduation & Certificate Status
const isCurrentCoursePassed = computed(() => {
  return !!(activeCourse.value?.isExamPassed || (activeCourse.value as any)?.userProgress?.isExamPassed)
})

const currentCertificateId = computed(() => {
  return activeCourse.value?.certificateId || (activeCourse.value as any)?.userProgress?.certificateId || null
})

// Progress percentage computed (Consistent with backend equal unit weighting)
const overallProgressPercent = computed(() => {
  if (!activeCourse.value) return 0
  if (isCurrentCoursePassed.value) return 100
  const chapters = activeCourse.value.chapters || []
  if (chapters.length === 0) return 0
  const completed = chapters.filter((c) => c.isCompleted).length
  const totalUnits = chapters.length + 1 // all chapters + final exam
  const completedUnits = completed + (isCurrentCoursePassed.value ? 1 : 0)
  return Math.min(100, Math.round((completedUnits / totalUnits) * 100))
})

// Check if exam is unlocked (All prior chapters must be completed)
const isExamUnlocked = computed(() => {
  if (!activeCourse.value) return false
  if (isCurrentCoursePassed.value) return true
  const chapters = activeCourse.value.chapters || []
  if (chapters.length === 0) return true
  return chapters.every((c) => c.isCompleted)
})

// Lifecycle
onMounted(() => {
  loadCourseDetails()
  if (selectedChapterId.value) {
    selectChapter(selectedChapterId.value)
  } else if (isExamActive.value) {
    startExam()
  }

  const scrollEl = document.getElementById('app-main-scroll')
  if (scrollEl) {
    scrollEl.addEventListener('scroll', updateReadingScrollProgress, { passive: true })
  }
  window.addEventListener('scroll', updateReadingScrollProgress, { passive: true })
})

onUnmounted(() => {
  clearInterval(chapterQuizTimerInterval)
  clearInterval(examTimerInterval)

  const scrollEl = document.getElementById('app-main-scroll')
  if (scrollEl) {
    scrollEl.removeEventListener('scroll', updateReadingScrollProgress)
  }
  window.removeEventListener('scroll', updateReadingScrollProgress)
})

// Watch route triggers
watch(
  () => selectedChapterId.value,
  (newId) => {
    if (newId) {
      selectChapter(newId)
    } else {
      activeChapterData.value = null
    }
  }
)

watch(
  () => isExamActive.value,
  (active) => {
    if (active && !examResult.value) {
      startExam()
    }
  }
)

async function loadCourseDetails() {
  if (!activeCourse.value) return
  try {
    isLoadingReviews.value = true
    const revs = await api.courses.getReviews(activeCourse.value.id)
    reviews.value = revs
  } catch (e) {
    console.error('Failed to load reviews:', e)
  } finally {
    isLoadingReviews.value = false
  }
}

// --- Chapter Actions ---
async function selectChapter(chapterId: string) {
  if (!activeCourse.value) return
  isLoadingChapter.value = true
  selectedChapterId.value = chapterId
  isExamActive.value = false
  chapterQuizSubmitted.value = false
  chapterQuizAnswers.value = {}
  activeChapterTab.value = 'markdown'

  try {
    const chap = await api.courses.getChapter(activeCourse.value.id, chapterId)
    activeChapterData.value = chap

    // If chapter doesn't have markdown, fallback to flashcards or quiz
    if (!chap.markdownContent && chap.flashcards && chap.flashcards.length > 0) {
      activeChapterTab.value = 'flashcards'
    } else if (!chap.markdownContent && chap.questions && chap.questions.length > 0) {
      activeChapterTab.value = 'quiz'
      startChapterQuizTimer(chap.quizDurationMinutes || 5)
    }
  } catch (e) {
    console.error('Failed to load chapter content:', e)
  } finally {
    isLoadingChapter.value = false
  }
}

function closeChapterRoom() {
  selectedChapterId.value = null
  activeChapterData.value = null
  isExamActive.value = false
  clearInterval(chapterQuizTimerInterval)
  if (activeCourse.value) {
    openCourse(activeCourse.value.id)
  }
}

async function markChapterAsRead() {
  if (!activeCourse.value || !activeChapterData.value) return
  isMarkingRead.value = true
  try {
    await api.courses.recordChapterProgress(activeCourse.value.id, activeChapterData.value.id, {
      isRead: true,
    })
    // Update local state
    if (!activeChapterData.value.userProgress) {
      activeChapterData.value.userProgress = {
        isRead: true,
        flashcardMastered: false,
        quizCompleted: false,
        bestQuizScore: 0,
        bestQuizAccuracy: 0,
      }
    } else {
      activeChapterData.value.userProgress.isRead = true
    }

    // Refresh activeCourse
    await openCourse(activeCourse.value.id, activeChapterData.value.id)

    // Auto switch to flashcards or quiz if available
    if (activeChapterData.value.flashcards && activeChapterData.value.flashcards.length > 0) {
      activeChapterTab.value = 'flashcards'
    } else if (activeChapterData.value.questions && activeChapterData.value.questions.length > 0) {
      activeChapterTab.value = 'quiz'
      startChapterQuizTimer(activeChapterData.value.quizDurationMinutes || 5)
    }
  } catch (e) {
    console.error('Failed to mark read:', e)
  } finally {
    isMarkingRead.value = false
  }
}

function handleFlashcardCompleted(_earnedXp: number) {
  if (!activeCourse.value || !activeChapterData.value) return
  api.courses
    .recordChapterProgress(activeCourse.value.id, activeChapterData.value.id, {
      flashcardMastered: true,
    })
    .then(() => {
      openCourse(activeCourse.value!.id, activeChapterData.value!.id)
      if (activeChapterData.value?.questions && activeChapterData.value.questions.length > 0) {
        activeChapterTab.value = 'quiz'
        startChapterQuizTimer(activeChapterData.value.quizDurationMinutes || 5)
      }
    })
}

function startChapterQuizTimer(durationMinutes: number) {
  clearInterval(chapterQuizTimerInterval)
  chapterQuizTimeLeft.value = durationMinutes * 60
  chapterQuizTimerInterval = setInterval(() => {
    if (chapterQuizTimeLeft.value > 0) {
      chapterQuizTimeLeft.value--
    } else {
      clearInterval(chapterQuizTimerInterval)
      submitChapterQuiz()
    }
  }, 1000)
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

async function submitChapterQuiz() {
  if (!activeCourse.value || !activeChapterData.value) return
  clearInterval(chapterQuizTimerInterval)
  isSubmittingChapterQuiz.value = true

  const questions = activeChapterData.value.questions || []
  let correct = 0

  questions.forEach((q) => {
    const userAns = (chapterQuizAnswers.value[q.id] || '').trim().toLowerCase()
    const targetAns = q.answer.trim().toLowerCase()
    if (userAns === targetAns) {
      correct++
    }
  })

  const total = questions.length
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 100
  const xpEarned = correct * 10

  chapterQuizScore.value = correct
  chapterQuizAccuracy.value = accuracy
  chapterQuizSubmitted.value = true

  try {
    await api.courses.recordChapterProgress(activeCourse.value.id, activeChapterData.value.id, {
      quizResult: {
        totalQuestions: total,
        correctCount: correct,
        accuracy,
        xpEarned,
      },
    })

    if (accuracy >= 75) {
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } })
    }

    // Refresh course progress
    await openCourse(activeCourse.value.id, activeChapterData.value.id)
  } catch (e) {
    console.error('Failed to submit chapter quiz:', e)
  } finally {
    isSubmittingChapterQuiz.value = false
  }
}

function retryChapterQuiz() {
  chapterQuizSubmitted.value = false
  chapterQuizAnswers.value = {}
  startChapterQuizTimer(activeChapterData.value?.quizDurationMinutes || 5)
}

// --- Final Exam Actions ---
async function startExam() {
  if (!activeCourse.value) return
  isExamActive.value = true
  selectedChapterId.value = null
  activeChapterData.value = null
  examResult.value = null
  examAnswers.value = {}
  examCurrentIndex.value = 0

  try {
    const examData = await api.courses.getExam(activeCourse.value.id)
    examQuestions.value = examData.questions
    examTimeLeftSeconds.value = (examData.durationMinutes || 15) * 60

    // Start timer
    clearInterval(examTimerInterval)
    examTimerInterval = setInterval(() => {
      if (examTimeLeftSeconds.value > 0) {
        examTimeLeftSeconds.value--
      } else {
        clearInterval(examTimerInterval)
        submitExam()
      }
    }, 1000)
  } catch (err: any) {
    console.error('Failed to start exam:', err)
    alert(err.message || 'Gagal memulai ujian akhir.')
    isExamActive.value = false
  }
}

function exitExam() {
  if (!examResult.value) {
    const confirmExit = confirm('Apakah Anda yakin ingin keluar dari ujian akhir? Jawaban belum disimpan.')
    if (!confirmExit) return
  }
  clearInterval(examTimerInterval)
  isExamActive.value = false
  examResult.value = null
  if (activeCourse.value) {
    openCourse(activeCourse.value.id)
  }
}

async function submitExam() {
  if (!activeCourse.value) return
  clearInterval(examTimerInterval)
  examIsSubmitting.value = true

  try {
    const totalTimeSpent = (activeCourse.value.examDurationMinutes || 15) * 60 - examTimeLeftSeconds.value
    const res = await api.courses.submitExam(activeCourse.value.id, {
      answers: examAnswers.value,
      timeSpentSeconds: Math.max(1, totalTimeSpent),
    })

    examResult.value = res

    if (res.isPassed) {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } })
    }

    // Refresh course data
    await openCourse(activeCourse.value.id)
  } catch (err: any) {
    console.error('Failed to submit exam:', err)
    alert(err.message || 'Gagal mengirim lembar ujian.')
  } finally {
    examIsSubmitting.value = false
  }
}

async function handleToggleBookmark() {
  if (!activeCourse.value || isTogglingBookmark.value) return
  isTogglingBookmark.value = true
  try {
    await toggleCourseBookmark(activeCourse.value.id)
  } finally {
    isTogglingBookmark.value = false
  }
}

const isCourseCreator = computed(() => {
  if (!currentUser.value || !activeCourse.value) return false
  return !!activeCourse.value.isOwner || currentUser.value.id === activeCourse.value.userId || currentUser.value.id === activeCourse.value.author?.id
})

const userExistingReview = computed(() => {
  if (!currentUser.value) return null
  return reviews.value.find((r) => r.userId === currentUser.value?.id) || null
})

const canUserReview = computed(() => {
  if (!currentUser.value || !activeCourse.value) return false
  if (isCourseCreator.value) return false
  if (!isCurrentCoursePassed.value) return false
  if (userExistingReview.value) return false
  return true
})

async function handleAddReview() {
  if (!activeCourse.value || !newReviewComment.value.trim() || isSubmittingReview.value) return
  if (!canUserReview.value) return
  isSubmittingReview.value = true
  try {
    const resp = await api.courses.addReview(activeCourse.value.id, newReviewRating.value, newReviewComment.value)
    reviews.value.unshift(resp.review)
    newReviewComment.value = ''
    newReviewRating.value = 5
  } catch (err: any) {
    alert(err.message || 'Gagal mengirim ulasan.')
  } finally {
    isSubmittingReview.value = false
  }
}
</script>

<template>
  <div v-if="activeCourse" class="space-y-6 pb-16 animate-in fade-in duration-300 max-w-6xl mx-auto">
    <!-- ========================================== -->
    <!-- 1. FINAL EXAM ROOM (Mode Ujian Akhir)      -->
    <!-- ========================================== -->
    <div v-if="isExamActive" class="space-y-6">
      <!-- Exam Header Bar -->
      <div
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-primary/30 shadow-sm"
      >
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <Badge variant="outline" class="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 text-xs">
              <Award class="size-3.5" />
              <span>Ujian Akhir Resmi Kelulusan</span>
            </Badge>
            <Badge variant="outline" class="text-xs">
              {{ activeCourse.level }} • {{ findLanguageInfo(activeCourse.targetLanguage)?.name }}
            </Badge>
          </div>
          <h1 class="text-xl font-bold text-foreground">{{ activeCourse.title }}</h1>
        </div>

        <div class="flex items-center gap-4 shrink-0">
          <!-- Countdown Timer -->
          <div
            v-if="!examResult"
            class="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-sm font-mono font-bold"
            :class="
              examTimeLeftSeconds < 120
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 animate-pulse'
                : 'bg-muted/60 border-border text-foreground'
            "
          >
            <Clock class="size-4" />
            <span>{{ formatTimer(examTimeLeftSeconds) }}</span>
          </div>

          <Button variant="ghost" size="sm" class="text-muted-foreground hover:text-foreground text-xs" @click="exitExam">
            {{ examResult ? 'Kembali ke Silabus' : 'Keluar Ujian' }}
          </Button>
        </div>
      </div>

      <!-- Exam Result Screen (After Submit) -->
      <Card v-if="examResult" class="p-8 text-center space-y-6 rounded-2xl border-2" :class="examResult.isPassed ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/5'">
        <div class="size-20 mx-auto rounded-3xl flex items-center justify-center" :class="examResult.isPassed ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'">
          <Award v-if="examResult.isPassed" class="size-10" />
          <AlertCircle v-else class="size-10" />
        </div>

        <div class="space-y-2 max-w-lg mx-auto">
          <Badge :variant="examResult.isPassed ? 'default' : 'outline'" class="text-xs py-1 px-3">
            {{ examResult.isPassed ? '🎉 KELULUSAN TERKONFIRMASI' : '⚠️ BELUM MEMENUHI SYARAT KELULUSAN' }}
          </Badge>
          <h2 class="text-2xl font-black text-foreground">
            {{ examResult.isPassed ? 'Selamat! Anda Berhasil Lulus Ujian Akhir' : 'Tetap Semangat, Anda Bisa Mengulanginya!' }}
          </h2>
          <p class="text-sm text-muted-foreground">
            {{
              examResult.isPassed
                ? `Akurasi Anda ${examResult.accuracy}% (syarat minimal ${examResult.passingScore}%). Sertifikat digital resmi telah diterbitkan untuk Anda!`
                : `Akurasi Anda ${examResult.accuracy}%. Syarat minimal kelulusan adalah ${examResult.passingScore}%. Pelajari kembali materi bab dan coba lagi.`
            }}
          </p>
        </div>

        <!-- Metrics Box -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto text-left">
          <div class="p-3.5 rounded-xl bg-card border border-border/80">
            <div class="text-[11px] text-muted-foreground font-medium">Nilai Akurasi</div>
            <div class="text-xl font-black" :class="examResult.isPassed ? 'text-emerald-600' : 'text-amber-600'">
              {{ examResult.accuracy }}%
            </div>
          </div>
          <div class="p-3.5 rounded-xl bg-card border border-border/80">
            <div class="text-[11px] text-muted-foreground font-medium">Jawaban Benar</div>
            <div class="text-xl font-black text-foreground">
              {{ examResult.correctCount }} / {{ examResult.totalQuestions }}
            </div>
          </div>
          <div class="p-3.5 rounded-xl bg-card border border-border/80">
            <div class="text-[11px] text-muted-foreground font-medium">XP Diperoleh</div>
            <div class="text-xl font-black text-primary">+{{ examResult.xpEarned }} XP</div>
          </div>
          <div class="p-3.5 rounded-xl bg-card border border-border/80">
            <div class="text-[11px] text-muted-foreground font-medium">Sertifikat</div>
            <div class="text-xs font-mono font-bold truncate text-foreground">
              {{ examResult.certificateId || 'Tidak Ada' }}
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-wrap items-center justify-center gap-3 pt-4">
          <Button
            v-if="examResult.isPassed && examResult.certificateId"
            variant="default"
            size="lg"
            class="gap-2 rounded-xl shadow-md font-bold px-6"
            @click="isCertificateOpen = true"
          >
            <ShieldCheck class="size-5" />
            <span>Buka Sertifikat Kelulusan Resmi</span>
          </Button>

          <Button variant="outline" size="lg" class="rounded-xl gap-2 text-xs" @click="startExam">
            <RotateCcw class="size-4" />
            <span>Ulangi Ujian Akhir</span>
          </Button>

          <Button variant="ghost" size="lg" class="rounded-xl text-xs" @click="exitExam">
            Kembali ke Halaman Kursus
          </Button>
        </div>

        <!-- Breakdown Answers -->
        <div class="mt-8 text-left space-y-4 max-w-3xl mx-auto pt-6 border-t border-border">
          <h3 class="font-bold text-base text-foreground">Pembahasan Soal Ujian</h3>
          <div class="space-y-3">
            <div
              v-for="(item, idx) in examResult.breakdown"
              :key="item.id"
              class="p-4 rounded-xl border text-xs space-y-2"
              :class="item.isCorrect ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'"
            >
              <div class="flex items-center justify-between gap-2 font-medium">
                <span class="text-foreground">Soal #{{ idx + 1 }}: {{ item.question }}</span>
                <Badge :variant="item.isCorrect ? 'default' : 'destructive'" class="text-[10px] py-0 px-1.5 shrink-0">
                  {{ item.isCorrect ? 'Benar' : 'Salah' }}
                </Badge>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                <div>
                  <span class="text-muted-foreground">Jawaban Anda: </span>
                  <span class="font-semibold" :class="item.isCorrect ? 'text-emerald-600' : 'text-rose-600'">
                    {{ item.userAnswer || '(Tidak dijawab)' }}
                  </span>
                </div>
                <div>
                  <span class="text-muted-foreground">Kunci Jawaban: </span>
                  <span class="font-semibold text-foreground">{{ item.correctAnswer }}</span>
                </div>
              </div>
              <div v-if="item.explanation" class="text-[11px] text-muted-foreground italic border-t border-border/40 pt-1.5">
                💡 {{ item.explanation }}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <!-- Active Exam Questions Sheet (While taking exam) -->
      <div v-else class="space-y-6">
        <!-- Progress Bar & Question Counter -->
        <div class="space-y-2">
          <div class="flex items-center justify-between text-xs font-semibold">
            <span class="text-foreground">
              Soal {{ examCurrentIndex + 1 }} dari {{ examQuestions.length }}
            </span>
            <span class="text-muted-foreground">
              {{ Object.keys(examAnswers).length }} terjawab
            </span>
          </div>
          <Progress :model-value="((examCurrentIndex + 1) / examQuestions.length) * 100" class="h-2 rounded-full" />
        </div>

        <!-- Question Navigator Dots -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-2">
          <button
            v-for="(q, idx) in examQuestions"
            :key="q.id"
            class="size-8 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center justify-center border"
            :class="
              idx === examCurrentIndex
                ? 'bg-primary text-primary-foreground border-primary'
                : examAnswers[q.id]
                ? 'bg-muted/80 text-foreground border-primary/40'
                : 'bg-background text-muted-foreground border-border'
            "
            @click="examCurrentIndex = idx"
          >
            {{ idx + 1 }}
          </button>
        </div>

        <!-- Current Question Card -->
        <Card v-if="examQuestions[examCurrentIndex]" class="p-6 sm:p-8 rounded-2xl border border-border/80 space-y-6">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <Badge variant="outline" class="text-xs uppercase tracking-wider text-primary">
                {{
                  examQuestions[examCurrentIndex].type === 'choice'
                    ? 'Pilihan Ganda'
                    : examQuestions[examCurrentIndex].type === 'sentence'
                    ? 'Susun Kalimat'
                    : 'Ketik Jawaban'
                }}
              </Badge>
              <button
                class="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10"
                title="Dengarkan Soal"
                @click="speak(examQuestions[examCurrentIndex].question, activeCourse.targetLanguage)"
              >
                <Volume2 class="size-4" />
              </button>
            </div>
            <h2 class="text-xl sm:text-2xl font-bold text-foreground leading-snug">
              {{ examQuestions[examCurrentIndex].question }}
            </h2>
            <p v-if="examQuestions[examCurrentIndex].translation" class="text-xs text-muted-foreground">
              Artinya: {{ examQuestions[examCurrentIndex].translation }}
            </p>
          </div>

          <!-- Question Input Types -->
          <!-- 1. Multiple Choice -->
          <div v-if="examQuestions[examCurrentIndex].type === 'choice'" class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              v-for="opt in examQuestions[examCurrentIndex].options || []"
              :key="opt"
              class="p-4 rounded-xl border text-left font-semibold text-sm transition-all flex items-center justify-between"
              :class="
                examAnswers[examQuestions[examCurrentIndex].id] === opt
                  ? 'border-primary bg-primary/10 text-primary shadow-xs'
                  : 'border-border/80 bg-card hover:border-primary/40 text-foreground'
              "
              @click="examAnswers[examQuestions[examCurrentIndex].id] = opt"
            >
              <span>{{ opt }}</span>
              <div
                class="size-5 rounded-full border flex items-center justify-center"
                :class="examAnswers[examQuestions[examCurrentIndex].id] === opt ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'"
              >
                <Check v-if="examAnswers[examQuestions[examCurrentIndex].id] === opt" class="size-3" />
              </div>
            </button>
          </div>

          <!-- 2. Text Input -->
          <div v-else-if="examQuestions[examCurrentIndex].type === 'input'" class="space-y-3 pt-2">
            <Input
              :model-value="examAnswers[examQuestions[examCurrentIndex].id] || ''"
              placeholder="Ketik jawaban Anda di sini..."
              class="h-12 text-base font-medium rounded-xl"
              @update:model-value="examAnswers[examQuestions[examCurrentIndex].id] = String($event)"
            />
          </div>

          <!-- 3. Sentence Builder -->
          <div v-else-if="examQuestions[examCurrentIndex].type === 'sentence'" class="pt-2">
            <SentenceBuilder
              :model-value="examAnswers[examQuestions[examCurrentIndex].id] || ''"
              :answer="examQuestions[examCurrentIndex].answer"
              @update:model-value="examAnswers[examQuestions[examCurrentIndex].id] = $event"
            />
          </div>

          <!-- Question Navigation Buttons -->
          <div class="flex items-center justify-between pt-6 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              :disabled="examCurrentIndex === 0"
              class="gap-1.5 text-xs rounded-xl"
              @click="examCurrentIndex--"
            >
              <ArrowLeft class="size-3.5" />
              <span>Sebelumnya</span>
            </Button>

            <div class="flex items-center gap-2">
              <Button
                v-if="examCurrentIndex < examQuestions.length - 1"
                variant="default"
                size="sm"
                class="gap-1.5 text-xs rounded-xl font-bold"
                @click="examCurrentIndex++"
              >
                <span>Berikutnya</span>
                <ArrowRight class="size-3.5" />
              </Button>

              <Button
                v-else
                variant="default"
                size="sm"
                class="gap-1.5 text-xs rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 shadow-md text-white"
                :disabled="examIsSubmitting"
                @click="submitExam"
              >
                <Loader2 v-if="examIsSubmitting" class="size-3.5 animate-spin" />
                <Send v-else class="size-3.5" />
                <span>Kirim Jawaban Ujian</span>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 2. CHAPTER STUDY ROOM (Ruang Belajar Bab)  -->
    <!-- ========================================== -->
    <div v-else-if="activeChapterData" class="space-y-6">
      <!-- Breadcrumb & Back Header -->
      <div class="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" class="gap-2 text-xs font-medium text-muted-foreground hover:text-foreground" @click="closeChapterRoom">
          <ArrowLeft class="size-4" />
          <span>Kembali ke Silabus Kursus</span>
        </Button>

        <Badge variant="outline" class="text-xs font-semibold">
          {{ activeCourse.level }} • Bab {{ activeChapterData.orderIndex }}
        </Badge>
      </div>

      <!-- Chapter Hero Banner -->
      <div class="p-6 rounded-2xl bg-card border border-border/80 space-y-2">
        <div class="flex items-center gap-2 text-xs font-semibold text-primary">
          <span>BAB {{ activeChapterData.orderIndex }}</span>
          <span>•</span>
          <span>{{ activeCourse.title }}</span>
        </div>
        <h1 class="text-2xl font-black text-foreground">{{ activeChapterData.title }}</h1>
        <p v-if="activeChapterData.description" class="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {{ activeChapterData.description }}
        </p>
      </div>

      <!-- Activity Tabs within Chapter -->
      <Tabs :model-value="activeChapterTab" class="w-full space-y-4" @update:model-value="activeChapterTab = $event as any">
        <TabsList class="grid grid-cols-3 max-w-md bg-muted/70 p-1 rounded-xl">
          <TabsTrigger value="markdown" class="text-xs font-medium flex items-center gap-1.5">
            <BookOpen class="size-3.5" />
            <span>Materi</span>
          </TabsTrigger>
          <TabsTrigger value="flashcards" class="text-xs font-medium flex items-center gap-1.5" :disabled="!activeChapterData.flashcards || activeChapterData.flashcards.length === 0">
            <Layers class="size-3.5" />
            <span>Flashcard ({{ activeChapterData.flashcards?.length || 0 }})</span>
          </TabsTrigger>
          <TabsTrigger value="quiz" class="text-xs font-medium flex items-center gap-1.5" :disabled="!activeChapterData.questions || activeChapterData.questions.length === 0" @click="startChapterQuizTimer(activeChapterData.quizDurationMinutes || 5)">
            <HelpCircle class="size-3.5" />
            <span>Kuis Bab ({{ activeChapterData.questions?.length || 0 }})</span>
          </TabsTrigger>
        </TabsList>

        <!-- TAB 1: Markdown Lesson Reading -->
        <TabsContent value="markdown" class="space-y-4">
          <!-- 2-Column Grid: Main Reader + Sticky Table of Contents -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <!-- Left: Main Markdown Reader Card (lg:col-span-8 or 9) -->
            <Card class="lg:col-span-8 xl:col-span-9 p-6 sm:p-8 rounded-2xl border border-border/80 space-y-6 bg-card relative shadow-xs">
              <!-- Reader Toolbar -->
              <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/60 text-xs">
                <div class="flex items-center gap-3">
                  <div class="flex items-center gap-1.5 text-muted-foreground font-medium">
                    <Clock class="size-4 text-primary" />
                    <span>Estimasi: {{ parsedMarkdownData.readingTimeMinutes }} menit</span>
                  </div>
                  <span class="text-muted-foreground/40">•</span>
                  <div class="text-muted-foreground font-mono text-[11px] font-semibold text-primary">
                    {{ readingProgressPercent }}% selesai
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <!-- Font Family Toggle (Sans vs Serif) -->
                  <div class="flex items-center bg-muted/50 p-0.5 rounded-lg border border-border/60">
                    <button
                      type="button"
                      class="px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer"
                      :class="readingFont === 'sans' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
                      title="Font Modern Sans-Serif"
                      @click="readingFont = 'sans'"
                    >
                      Sans
                    </button>
                    <button
                      type="button"
                      class="px-2 py-1 rounded text-xs font-serif font-medium transition-colors cursor-pointer"
                      :class="readingFont === 'serif' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
                      title="Font Editorial Serif"
                      @click="readingFont = 'serif'"
                    >
                      Serif
                    </button>
                  </div>

                  <!-- Text Size Controls -->
                  <div class="flex items-center gap-0.5 bg-muted/50 p-0.5 rounded-lg border border-border/60">
                    <button
                      type="button"
                      class="size-7 rounded text-xs font-bold transition-colors cursor-pointer flex items-center justify-center"
                      :class="readingSize === 'sm' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
                      title="Ukuran Kecil (A-)"
                      @click="readingSize = 'sm'"
                    >
                      A-
                    </button>
                    <button
                      type="button"
                      class="size-7 rounded text-xs font-bold transition-colors cursor-pointer flex items-center justify-center"
                      :class="readingSize === 'base' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
                      title="Ukuran Standar (A)"
                      @click="readingSize = 'base'"
                    >
                      A
                    </button>
                    <button
                      type="button"
                      class="size-7 rounded text-xs font-bold transition-colors cursor-pointer flex items-center justify-center"
                      :class="readingSize === 'lg' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
                      title="Ukuran Besar (A+)"
                      @click="readingSize = 'lg'"
                    >
                      A+
                    </button>
                  </div>

                  <!-- Scroll To Top Button -->
                  <button
                    type="button"
                    class="size-7 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                    title="Kembali ke atas"
                    @click="scrollToTopOfLesson"
                  >
                    <ArrowUp class="size-3.5" />
                  </button>
                </div>
              </div>

              <!-- Markdown Render Area with Event Delegation for TTS & Copy Code -->
              <div
                class="markdown-prose max-w-none transition-all selection:bg-primary/20"
                :class="[
                  readingSize === 'sm' ? 'reading-size-sm' : readingSize === 'lg' ? 'reading-size-lg' : 'reading-size-base',
                  readingFont === 'serif' ? 'font-reading-serif' : 'font-sans'
                ]"
                v-html="parsedMarkdownData.html"
                @click="handleMarkdownClick"
              ></div>

              <!-- Completion Action Footer -->
              <div class="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-border">
                <div class="flex items-center gap-2">
                  <Badge
                    :variant="activeChapterData.userProgress?.isRead ? 'default' : 'outline'"
                    class="text-xs gap-1.5 py-1 px-3 rounded-lg"
                  >
                    <CheckCircle2 v-if="activeChapterData.userProgress?.isRead" class="size-3.5 text-emerald-400" />
                    <span>{{ activeChapterData.userProgress?.isRead ? 'Materi Selesai Dibaca' : 'Belum Selesai Dibaca' }}</span>
                  </Badge>
                </div>

                <div class="flex items-center gap-2">
                  <Button
                    variant="default"
                    class="gap-2 rounded-xl text-xs font-bold px-4 cursor-pointer"
                    :disabled="isMarkingRead"
                    @click="markChapterAsRead"
                  >
                    <Check class="size-4" />
                    <span>{{ activeChapterData.userProgress?.isRead ? 'Sudah Dibaca (Lanjut)' : 'Tandai Selesai Dibaca' }}</span>
                  </Button>
                </div>
              </div>
            </Card>

            <!-- Right: Sticky Table of Contents Sidebar (lg:col-span-4 or 3) -->
            <div class="hidden lg:block lg:col-span-4 xl:col-span-3 sticky top-12 space-y-4">
              <Card class="p-5 rounded-2xl border border-border/80 bg-card space-y-4 shadow-xs">
                <div class="flex items-center justify-between pb-3 border-b border-border/60">
                  <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <ListOrdered class="size-4 text-primary" />
                    <span>Daftar Isi Bab</span>
                  </div>
                  <span class="text-[11px] font-mono font-medium text-muted-foreground bg-muted/70 px-2 py-0.5 rounded-full">
                    {{ parsedMarkdownData.headings.length }} Topik
                  </span>
                </div>

                <!-- TOC Items list -->
                <div v-if="parsedMarkdownData.headings.length > 0" class="space-y-1 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1 text-xs">
                  <button
                    v-for="h in parsedMarkdownData.headings"
                    :key="h.id"
                    type="button"
                    class="w-full text-left py-1.5 px-2.5 rounded-lg transition-colors flex items-center gap-2 group cursor-pointer"
                    :class="[
                      h.level === 3 ? 'pl-5 text-muted-foreground text-[11px]' : 'font-medium text-foreground',
                      activeHeadingId === h.id ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted/60'
                    ]"
                    @click="scrollToHeading(h.id)"
                  >
                    <ChevronRight class="size-3 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5 shrink-0" />
                    <span class="line-clamp-1">{{ h.text }}</span>
                  </button>
                </div>
                <div v-else class="text-xs text-muted-foreground italic py-2">
                  Tidak ada sub-heading pada bab ini.
                </div>

                <!-- Reading Progress in TOC Card -->
                <div class="pt-3 border-t border-border/60 space-y-2">
                  <div class="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Progres Membaca</span>
                    <span class="font-bold text-foreground">{{ readingProgressPercent }}%</span>
                  </div>
                  <Progress :model-value="readingProgressPercent" class="h-1.5" />
                </div>
              </Card>

              <!-- Audio Pronunciation Tip Card -->
              <Card class="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-2">
                <div class="flex items-center gap-2 text-primary font-bold text-xs">
                  <Volume2 class="size-4" />
                  <span>Audio Pelafalan Asli</span>
                </div>
                <p class="text-[11px] text-muted-foreground leading-relaxed">
                  Arahkan kursor atau klik tombol <strong class="text-foreground">Lafalkan</strong> pada sub-bab untuk mendengarkan intonasi dan pengucapan penutur asli.
                </p>
              </Card>
            </div>
          </div>
        </TabsContent>

        <!-- TAB 2: Flashcards Deck -->
        <TabsContent value="flashcards" class="space-y-4">
          <FlashcardSession
            v-if="activeChapterData.flashcards && activeChapterData.flashcards.length > 0"
            :cards="activeChapterData.flashcards"
            :target-language="activeCourse.targetLanguage"
            :course-title="activeChapterData.title"
            :course-id="activeCourse.id"
            @xp-awarded="handleFlashcardCompleted"
            @go-to-quiz="activeChapterTab = 'quiz'; startChapterQuizTimer(activeChapterData.quizDurationMinutes || 5)"
          />
        </TabsContent>

        <!-- TAB 3: Chapter Practice Quiz -->
        <TabsContent value="quiz" class="space-y-4">
          <!-- Quiz Result Screen -->
          <Card v-if="chapterQuizSubmitted" class="p-8 text-center space-y-4 rounded-2xl border-2" :class="chapterQuizAccuracy >= 75 ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/5'">
            <div class="size-16 mx-auto rounded-2xl flex items-center justify-center" :class="chapterQuizAccuracy >= 75 ? 'bg-emerald-500/20 text-emerald-600' : 'bg-amber-500/20 text-amber-600'">
              <Award v-if="chapterQuizAccuracy >= 75" class="size-8" />
              <RotateCcw v-else class="size-8" />
            </div>

            <h3 class="text-xl font-bold text-foreground">
              {{ chapterQuizAccuracy >= 75 ? 'Kuis Bab Berhasil Diselesaikan!' : 'Latihan Selesai, Coba Tingkatkan Skor!' }}
            </h3>
            <p class="text-xs text-muted-foreground">
              Skor: {{ chapterQuizScore }} / {{ activeChapterData.questions?.length }} (Akurasi {{ chapterQuizAccuracy }}%)
            </p>

            <div class="flex items-center justify-center gap-3 pt-3">
              <Button variant="outline" size="sm" class="rounded-xl text-xs gap-1.5" @click="retryChapterQuiz">
                <RotateCcw class="size-3.5" />
                <span>Ulangi Kuis</span>
              </Button>
              <Button variant="default" size="sm" class="rounded-xl text-xs gap-1.5" @click="closeChapterRoom">
                <span>Lanjut ke Silabus</span>
                <ArrowRight class="size-3.5" />
              </Button>
            </div>
          </Card>

          <!-- Active Quiz Form -->
          <div v-else-if="activeChapterData.questions && activeChapterData.questions.length > 0" class="space-y-4">
            <!-- Quiz Timer Bar -->
            <div class="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border text-xs">
              <div class="font-bold text-foreground">Latihan Soal Bab {{ activeChapterData.orderIndex }}</div>
              <div class="flex items-center gap-1.5 font-mono font-bold text-primary">
                <Timer class="size-4" />
                <span>{{ formatTimer(chapterQuizTimeLeft) }}</span>
              </div>
            </div>

            <!-- List Questions -->
            <div class="space-y-4">
              <Card v-for="(q, idx) in activeChapterData.questions" :key="q.id" class="p-5 rounded-2xl border border-border/80 space-y-3">
                <div class="flex items-center justify-between">
                  <Badge variant="outline" class="text-[10px] text-primary">Soal {{ idx + 1 }}</Badge>
                  <button
                    class="size-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary"
                    @click="speak(q.question, activeCourse.targetLanguage)"
                  >
                    <Volume2 class="size-3.5" />
                  </button>
                </div>
                <div class="font-bold text-sm text-foreground">{{ q.question }}</div>
                <div v-if="q.translation" class="text-xs text-muted-foreground">{{ q.translation }}</div>

                <!-- Multiple choice options -->
                <div v-if="q.type === 'choice'" class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  <button
                    v-for="opt in q.options || []"
                    :key="opt"
                    class="p-2.5 rounded-lg border text-left text-xs font-medium transition-all"
                    :class="chapterQuizAnswers[q.id] === opt ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-border bg-card hover:border-primary/40 text-foreground'"
                    @click="chapterQuizAnswers[q.id] = opt"
                  >
                    {{ opt }}
                  </button>
                </div>

                <!-- Text input -->
                <div v-else-if="q.type === 'input'" class="pt-2">
                  <Input
                    :model-value="chapterQuizAnswers[q.id] || ''"
                    placeholder="Ketik jawaban..."
                    class="h-9 text-xs rounded-lg"
                    @update:model-value="chapterQuizAnswers[q.id] = String($event)"
                  />
                </div>

                <!-- Sentence builder -->
                <div v-else-if="q.type === 'sentence'" class="pt-2">
                  <SentenceBuilder
                    :model-value="chapterQuizAnswers[q.id] || ''"
                    :answer="q.answer"
                    @update:model-value="chapterQuizAnswers[q.id] = $event"
                  />
                </div>
              </Card>
            </div>

            <!-- Submit Button -->
            <div class="flex justify-end pt-2">
              <Button
                variant="default"
                class="gap-2 rounded-xl text-xs font-bold"
                :disabled="isSubmittingChapterQuiz"
                @click="submitChapterQuiz"
              >
                <Loader2 v-if="isSubmittingChapterQuiz" class="size-4 animate-spin" />
                <Send v-else class="size-4" />
                <span>Selesaikan & Simpan Kuis Bab</span>
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>

    <!-- ============================================================== -->
    <!-- 3. COURSE SYLLABUS & ROADMAP (Tampilan Utama Mirip Playlist)   -->
    <!-- ============================================================== -->
    <div v-else class="space-y-8">
      <!-- Back Button -->
      <div>
        <Button variant="ghost" size="sm" class="gap-2 text-xs font-medium text-muted-foreground hover:text-foreground" @click="activeTab = 'courses'">
          <ArrowLeft class="size-4" />
          <span>Kembali ke Katalog Kursus</span>
        </Button>
      </div>

      <!-- Course Header Hero Card -->
      <Card class="overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8 shadow-sm space-y-6">
        <div class="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div class="space-y-3 max-w-2xl">
            <!-- Badges Row -->
            <div class="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" class="text-xs bg-background/80 font-medium py-0.5 px-2.5">
                <span class="mr-1.5">{{ findLanguageInfo(activeCourse.targetLanguage)?.flag || '🌐' }}</span>
                <span>{{ findLanguageInfo(activeCourse.targetLanguage)?.name || activeCourse.targetLanguage }}</span>
              </Badge>
              <Badge variant="outline" class="text-xs font-bold py-0.5 px-2.5 bg-primary/10 text-primary border-primary/20">
                {{ activeCourse.level }}
              </Badge>
              <Badge variant="outline" class="text-xs uppercase tracking-wider text-muted-foreground">
                {{ activeCourse.category }}
              </Badge>
              <Badge
                v-if="isCurrentCoursePassed"
                variant="default"
                class="text-xs font-bold bg-emerald-600 text-white gap-1 py-0.5 px-2.5 shadow-xs"
              >
                <ShieldCheck class="size-3.5" />
                <span>Lulus Bersertifikat</span>
              </Badge>
            </div>

            <!-- Title & Description -->
            <h1 class="text-2xl sm:text-3xl font-black text-foreground tracking-tight leading-tight">
              {{ activeCourse.title }}
            </h1>
            <p class="text-sm text-muted-foreground leading-relaxed">
              {{ activeCourse.description || 'Tidak ada deskripsi kursus.' }}
            </p>

            <!-- Author & Stats -->
            <div class="flex flex-wrap items-center gap-4 text-xs pt-1">
              <div
                v-if="activeCourse.author"
                class="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                @click="activeCourse.author?.id && openUserProfile(activeCourse.author.id)"
              >
                <div class="size-7 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                  {{ getAuthorInitial(activeCourse.author.name) }}
                </div>
                <div class="flex items-center gap-1 font-semibold text-foreground">
                  <span>{{ activeCourse.author.name }}</span>
                  <Badge v-if="activeCourse.author.isOfficial" variant="outline" class="text-[9px] py-0 px-1 bg-primary/10 text-primary border-primary/20">
                    Resmi
                  </Badge>
                </div>
              </div>

              <div class="flex items-center gap-1 text-amber-500 font-semibold">
                <Star class="size-4 fill-amber-500" />
                <span>{{ activeCourse.avgRating ? Number(activeCourse.avgRating).toFixed(1) : '5.0' }}</span>
                <span class="text-muted-foreground font-normal">({{ activeCourse.totalReviews || reviews.length }} ulasan)</span>
              </div>
            </div>
          </div>

          <!-- Right Action Box -->
          <div class="flex flex-col sm:flex-row md:flex-col items-stretch md:items-end gap-3 shrink-0">
            <!-- Bookmark Button -->
            <Button
              variant="outline"
              size="sm"
              class="rounded-xl gap-2 text-xs"
              :class="{ 'text-amber-500 border-amber-500/30 bg-amber-500/5': activeCourse.isBookmarked }"
              :disabled="isTogglingBookmark"
              @click="handleToggleBookmark"
            >
              <Bookmark class="size-4" :class="{ 'fill-amber-500': activeCourse.isBookmarked }" />
              <span>{{ activeCourse.isBookmarked ? 'Tersimpan di Favorit' : 'Simpan Kursus' }}</span>
            </Button>

            <!-- Certificate Button (if passed) -->
            <Button
              v-if="isCurrentCoursePassed && currentCertificateId"
              variant="default"
              class="rounded-xl gap-2 font-bold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
              @click="isCertificateOpen = true"
            >
              <Award class="size-4" />
              <span>Lihat Sertifikat Resmi</span>
            </Button>
          </div>
        </div>

        <!-- Overall Progress Strip -->
        <div class="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-2">
          <div class="flex items-center justify-between text-xs font-semibold">
            <span class="text-foreground flex items-center gap-1.5">
              <Sparkles class="size-3.5 text-primary" />
              <span>Progres Kelulusan Kursus</span>
            </span>
            <span
              :class="
                isCurrentCoursePassed
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : overallProgressPercent > 0
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground font-medium'
              "
            >
              {{
                isCurrentCoursePassed
                  ? '🏆 Lulus Bersertifikat'
                  : overallProgressPercent > 0
                  ? `${overallProgressPercent}% Selesai`
                  : '0% Belum Dimulai'
              }}
            </span>
          </div>
          <Progress :model-value="overallProgressPercent" class="h-2.5 rounded-full" />
        </div>
      </Card>

      <!-- Roadmap Silabus Bab (The Playlist-Like Experience) -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div class="space-y-0.5">
            <h2 class="text-lg font-bold text-foreground flex items-center gap-2">
              <Layers class="size-5 text-primary" />
              <span>Silabus Bab Pembelajaran ({{ activeCourse.chapters?.length || 0 }} Bab)</span>
            </h2>
            <p class="text-xs text-muted-foreground">
              Pelajari materi berurutan dari Bab 1 hingga Bab terakhir untuk membuka kunci Ujian Akhir Kelulusan.
            </p>
          </div>
        </div>

        <!-- Chapters List -->
        <div class="space-y-3">
          <div
            v-for="chap in activeCourse.chapters || []"
            :key="chap.id"
            class="group p-5 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
            :class="
              chap.isCompleted
                ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40'
                : 'bg-card border-border/80 hover:border-primary/40 hover:shadow-sm'
            "
            @click="selectChapter(chap.id)"
          >
            <div class="flex items-start gap-4">
              <!-- Chapter Order Badge -->
              <div
                class="size-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border transition-colors"
                :class="
                  chap.isCompleted
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-muted/80 text-foreground border-border group-hover:border-primary/40'
                "
              >
                <Check v-if="chap.isCompleted" class="size-5" />
                <span v-else>{{ chap.orderIndex }}</span>
              </div>

              <!-- Chapter Info -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                    {{ chap.title }}
                  </span>
                  <Badge v-if="chap.isCompleted" variant="outline" class="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 py-0 px-1.5">
                    Selesai
                  </Badge>
                </div>
                <p v-if="chap.description" class="text-xs text-muted-foreground line-clamp-2">
                  {{ chap.description }}
                </p>

                <!-- Activities Badges in Chapter -->
                <div class="flex items-center gap-2 text-[11px] text-muted-foreground pt-1 flex-wrap">
                  <span v-if="chap.hasMarkdown" class="flex items-center gap-1">
                    <BookOpen class="size-3 text-primary" />
                    <span>Materi Bacaan</span>
                  </span>
                  <span v-if="chap.flashcardCount && chap.flashcardCount > 0" class="flex items-center gap-1">
                    <Layers class="size-3 text-primary" />
                    <span>{{ chap.flashcardCount }} Flashcard</span>
                  </span>
                  <span v-if="chap.questionCount && chap.questionCount > 0" class="flex items-center gap-1">
                    <HelpCircle class="size-3 text-primary" />
                    <span>{{ chap.questionCount }} Soal Kuis ({{ chap.quizDurationMinutes }}m)</span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Action Button -->
            <div class="shrink-0 flex items-center justify-end">
              <Button
                size="sm"
                :variant="chap.isCompleted ? 'outline' : 'default'"
                class="rounded-xl text-xs font-semibold gap-1.5 group-hover:translate-x-0.5 transition-transform"
              >
                <span>{{ chap.isCompleted ? 'Pelajari Ulang' : 'Buka Bab Ini' }}</span>
                <ChevronRight class="size-3.5" />
              </Button>
            </div>
          </div>

          <!-- THE GRAND FINALE: FINAL EXAM CARD -->
          <div
            class="p-6 rounded-2xl border-2 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-5"
            :class="
              isCurrentCoursePassed
                ? 'bg-emerald-500/10 border-emerald-500/40'
                : isExamUnlocked
                ? 'bg-gradient-to-r from-amber-500/10 via-primary/10 to-amber-500/10 border-amber-500/40 shadow-md'
                : 'bg-muted/30 border-dashed border-border/80 opacity-80'
            "
          >
            <div class="flex items-start gap-4">
              <!-- Exam Trophy Icon -->
              <div
                class="size-12 rounded-2xl flex items-center justify-center font-bold shrink-0 border"
                :class="
                  isCurrentCoursePassed
                    ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30'
                    : isExamUnlocked
                    ? 'bg-amber-500/20 text-amber-600 border-amber-500/40 animate-pulse'
                    : 'bg-muted text-muted-foreground border-border'
                "
              >
                <Award class="size-6" />
              </div>

              <!-- Exam Info -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" class="text-xs font-bold uppercase tracking-wider" :class="isExamUnlocked ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40' : 'bg-muted text-muted-foreground'">
                    🏆 UJIAN AKHIR KELULUSAN
                  </Badge>
                  <Badge v-if="isCurrentCoursePassed" variant="default" class="text-xs bg-emerald-600 text-white">
                    LULUS • SKOR {{ activeCourse.bestExamScore }}
                  </Badge>
                </div>
                <h3 class="text-base font-bold text-foreground">
                  Ujian Akhir Komprehensif {{ activeCourse.title }}
                </h3>
                <p class="text-xs text-muted-foreground">
                  {{
                    isCurrentCoursePassed
                      ? 'Selamat! Anda telah lulus ujian akhir ini dan meraih sertifikat kelulusan terakreditasi.'
                      : isExamUnlocked
                      ? `Seluruh bab materi telah selesai! Ujian akhir terdiri dari ${activeCourse.examQuestionsCount || 10} soal (${activeCourse.examDurationMinutes} menit). Syarat kelulusan: ${activeCourse.examPassingScore}%.`
                      : `Ujian akhir masih terkunci. Selesaikan semua bab materi di atas untuk membuka gerbang ujian kelulusan.`
                  }}
                </p>
              </div>
            </div>

            <!-- Start Exam Button -->
            <div class="shrink-0 flex items-center justify-end gap-2">
              <Button
                v-if="isCurrentCoursePassed"
                variant="outline"
                size="sm"
                class="rounded-xl text-xs gap-1.5"
                @click="startExam"
              >
                <RotateCcw class="size-3.5" />
                <span>Ulangi Ujian</span>
              </Button>

              <Button
                v-if="isExamUnlocked"
                variant="default"
                size="lg"
                class="rounded-xl text-xs font-bold shadow-md gap-2"
                :class="isCurrentCoursePassed ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-primary hover:bg-primary/90'"
                @click="startExam"
              >
                <PlayCircle class="size-4" />
                <span>{{ isCurrentCoursePassed ? 'Mulai Ujian Lagi' : 'Mulai Ujian Akhir' }}</span>
              </Button>

              <Button
                v-else
                variant="outline"
                size="sm"
                disabled
                class="rounded-xl text-xs gap-1.5 opacity-60 cursor-not-allowed"
              >
                <Lock class="size-3.5" />
                <span>Ujian Terkunci</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- Reviews & Feedback Section -->
      <div v-if="isFeatureEnabled('enable_reviews')" class="pt-6 border-t border-border space-y-6">
        <div class="space-y-1">
          <h2 class="text-lg font-bold text-foreground">Ulasan & Penilaian Siswa</h2>
          <p class="text-xs text-muted-foreground">Pengalaman dan testimoni dari pembelajar yang telah mengikuti kursus ini.</p>
        </div>

        <!-- Status & Review Form -->
        <!-- Case 1: Belum Login -->
        <Card v-if="!currentUser" class="p-5 rounded-2xl border border-border/80 bg-muted/20 text-center space-y-2">
          <p class="text-xs text-muted-foreground font-medium">Masuk ke akun Anda untuk membaca dan memberikan ulasan kursus.</p>
        </Card>

        <!-- Case 2: Pembuat Kursus (Creator) -->
        <div v-else-if="isCourseCreator" class="p-4 rounded-2xl border border-primary/25 bg-primary/5 flex items-start gap-3">
          <ShieldCheck class="size-5 text-primary shrink-0 mt-0.5" />
          <div class="space-y-0.5 text-xs">
            <span class="font-bold text-foreground">Pembuat Kursus</span>
            <p class="text-muted-foreground">Anda adalah pemilik/pembuat kursus ini. Sesuai integritas platform, pembuat kursus tidak dapat memberikan ulasan ke kursus miliknya sendiri.</p>
          </div>
        </div>

        <!-- Case 3: Belum Menyelesaikan Kursus / Lulus Ujian Akhir -->
        <div v-else-if="!isCurrentCoursePassed" class="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex items-start gap-3">
          <Lock class="size-5 text-amber-500 shrink-0 mt-0.5" />
          <div class="space-y-0.5 text-xs">
            <span class="font-bold text-foreground">Ulasan Terkunci</span>
            <p class="text-muted-foreground">Anda harus menyelesaikan seluruh bab materi dan lulus Ujian Akhir kursus ini untuk dapat membagikan penilaian & ulasan.</p>
          </div>
        </div>

        <!-- Case 4: Sudah Pernah Mengulas (Hanya 1 kali ulasan) -->
        <div v-else-if="userExistingReview" class="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 flex items-start gap-3">
          <CheckCircle2 class="size-5 text-emerald-500 shrink-0 mt-0.5" />
          <div class="space-y-0.5 text-xs">
            <span class="font-bold text-foreground">Ulasan Anda Telah Tercatat</span>
            <p class="text-muted-foreground">Anda telah membagikan penilaian untuk kursus ini (1 ulasan per pembelajar). Terima kasih atas kontribusi dan masukan Anda!</p>
          </div>
        </div>

        <!-- Case 5: Memenuhi Syarat (Form Aktif) -->
        <Card v-else-if="canUserReview" class="p-5 rounded-2xl border border-border/80 space-y-3 bg-card shadow-xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-foreground">Tulis Ulasan Anda</span>
            <div class="flex items-center gap-1">
              <button
                v-for="s in 5"
                :key="s"
                type="button"
                class="size-6 text-muted-foreground hover:text-amber-500 transition-colors cursor-pointer"
                :class="{ 'text-amber-500 fill-amber-500': s <= newReviewRating }"
                @click="newReviewRating = s"
              >
                <Star class="size-4" :class="{ 'fill-amber-500': s <= newReviewRating }" />
              </button>
            </div>
          </div>
          <Input
            v-model="newReviewComment"
            placeholder="Bagikan pengalaman belajar Anda mengenai kursus ini..."
            class="text-xs rounded-xl"
            @keyup.enter="handleAddReview"
          />
          <div class="flex justify-end">
            <Button
              size="sm"
              variant="default"
              class="text-xs rounded-lg cursor-pointer font-semibold"
              :disabled="!newReviewComment.trim() || isSubmittingReview"
              @click="handleAddReview"
            >
              <Send class="size-3.5 mr-1.5" />
              <span>{{ isSubmittingReview ? 'Mengirim...' : 'Kirim Ulasan' }}</span>
            </Button>
          </div>
        </Card>

        <!-- Reviews List -->
        <div v-if="reviews.length > 0" class="space-y-3">
          <Card
            v-for="rev in reviews"
            :key="rev.id"
            class="p-4 rounded-xl border space-y-2 transition-all"
            :class="rev.userId === currentUser?.id ? 'border-primary/40 bg-primary/5 shadow-xs' : 'border-border/70'"
          >
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-2 font-semibold text-foreground">
                <div class="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                  {{ getAuthorInitial(rev.userName) }}
                </div>
                <span>{{ rev.userName || 'Siswa Lingua' }}</span>
                <Badge
                  v-if="rev.userId === currentUser?.id"
                  variant="outline"
                  class="text-[10px] py-0 px-2 text-primary border-primary/30 bg-primary/10 font-bold"
                >
                  Ulasan Anda
                </Badge>
              </div>
              <div class="flex items-center gap-1 text-amber-500 font-bold">
                <Star class="size-3.5 fill-amber-500" />
                <span>{{ rev.rating }}</span>
              </div>
            </div>
            <p v-if="rev.comment" class="text-xs text-muted-foreground leading-relaxed">
              "{{ rev.comment }}"
            </p>
          </Card>
        </div>
      </div>
    </div>

    <!-- Official Certificate Modal -->
    <CertificateModal
      v-if="activeCourse && currentCertificateId"
      :open="isCertificateOpen"
      :user-name="currentUser?.name || 'Siswa Lingua'"
      :course-title="activeCourse.title"
      :level="activeCourse.level"
      :target-language="activeCourse.targetLanguage"
      :accuracy="activeCourse.bestExamScore || 85"
      :certificate-id="currentCertificateId"
      @update:open="isCertificateOpen = $event"
    />
  </div>
</template>
