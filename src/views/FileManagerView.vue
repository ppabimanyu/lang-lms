<script setup lang="ts">
import { ref } from 'vue'
import {
  refreshCourses,
  openCourse,
} from '@/lib/storage'
import { parseQuestionsCSV, generateSampleCSVTemplate, parseFlashcardsCSV, generateSampleFlashcardCSVTemplate } from '@/lib/csv-parser'
import { generateSampleMarkdownTemplate } from '@/lib/markdown-parser'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  Download,
  HelpCircle,
  Loader2,
  Layers,
  PlusCircle,
  Trash2,
  Sparkles,
  Award,
  BookOpen,
} from '@lucide/vue'
import { api } from '@/lib/api'
import { SUPPORTED_LANGUAGES } from '@/lib/tts'
import { downloadText } from '@/lib/download'
import type { CourseFlashcard } from '@/types'

const activeManagerTab = ref<'builder' | 'templates' | 'guide'>('builder')
const isSubmittingCourse = ref(false)

interface ChapterDraft {
  id?: string
  orderIndex: number
  title: string
  description: string
  markdownContent: string
  markdownFilename: string
  quizDurationMinutes: number
  flashcards: CourseFlashcard[]
  flashcardFilename: string
  questions: any[]
  quizFilename: string
}

// Course Creator State
const courseForm = ref({
  title: '',
  level: 'A1',
  category: 'Grammatik & Percakapan',
  targetLanguage: 'de-DE',
  visibility: 'public' as 'public' | 'private',
  description: '',
  examDurationMinutes: 15,
  examPassingScore: 80,
  chapters: [
    {
      orderIndex: 1,
      title: 'Bab 1: Pengenalan & Kosakata Dasar',
      description: 'Materi dasar, kosakata penting, dan latihan pemahaman bab awal.',
      markdownContent: '',
      markdownFilename: '',
      quizDurationMinutes: 5,
      flashcards: [] as CourseFlashcard[],
      flashcardFilename: '',
      questions: [] as any[],
      quizFilename: '',
    },
  ] as ChapterDraft[],
  examQuestions: [] as any[],
  examFilename: '',
})

// Add new chapter
function addNewChapter() {
  const newIndex = courseForm.value.chapters.length + 1
  courseForm.value.chapters.push({
    orderIndex: newIndex,
    title: `Bab ${newIndex}: Topik Baru`,
    description: '',
    markdownContent: '',
    markdownFilename: '',
    quizDurationMinutes: 5,
    flashcards: [],
    flashcardFilename: '',
    questions: [],
    quizFilename: '',
  })
}

// Remove chapter
function removeChapter(index: number) {
  if (courseForm.value.chapters.length <= 1) {
    alert('Kursus wajib memiliki setidaknya 1 bab pembelajaran.')
    return
  }
  courseForm.value.chapters.splice(index, 1)
  // Re-index
  courseForm.value.chapters.forEach((c, idx) => {
    c.orderIndex = idx + 1
  })
}

// 1-Click Load Sample Course
function loadSampleCourseData() {
  courseForm.value.title = 'Kursus Kilat Percakapan Bahasa Jepang A1'
  courseForm.value.level = 'A1'
  courseForm.value.category = 'Percakapan Sehari-hari'
  courseForm.value.targetLanguage = 'ja-JP'
  courseForm.value.visibility = 'public'
  courseForm.value.description =
    'Pelajari salam dasar percakapan bahasa Jepang (Aisatsu) dan angka. Dilengkapi kuis bab dan ujian akhir bersertifikat.'
  courseForm.value.examDurationMinutes = 10
  courseForm.value.examPassingScore = 80

  courseForm.value.chapters = [
    {
      orderIndex: 1,
      title: 'Bab 1: Salam Sapaan Sehari-hari (Aisatsu)',
      description: 'Mengenal salam Ohayou, Konnichiwa, dan Arigatou dalam kehidupan sehari-hari.',
      markdownContent: `# Bab 1: Salam Sapaan Sehari-hari (Aisatsu)

Salam (*Aisatsu*) memegang peranan sangat penting dalam budaya Jepang.

## Ucapan Salam Utama:
- **Ohayou gozaimasu** (おはようございます) : Selamat pagi (formal)
- **Konnichiwa** (こんにちは) : Selamat siang / Halo
- **Konbanwa** (こんばんは) : Selamat malam
- **Arigatou gozaimasu** (ありがとうございます) : Terima kasih banyak
- **Sayounara** (さようなら) : Selamat tinggal`,
      markdownFilename: '01_aisatsu.md',
      quizDurationMinutes: 5,
      flashcards: [
        { front: 'Konnichiwa', back: 'Selamat siang / Halo', hint: 'Salam siang', explanation: 'Umum dipakai di siang hari.' },
        { front: 'Arigatou', back: 'Terima kasih', hint: 'Ungkapan syukur', explanation: 'Bentuk kasual dari arigatou gozaimasu.' },
      ],
      flashcardFilename: 'sample_fc1.csv',
      questions: [
        {
          type: 'choice',
          question: 'Apa arti dari "Konnichiwa"?',
          answer: 'Halo / Selamat siang',
          options: 'Selamat pagi|Halo / Selamat siang|Selamat tidur|Selamat tinggal',
          translation: 'Salam siang.',
          explanation: 'Konnichiwa dipakai saat siang hari.',
        },
        {
          type: 'input',
          question: 'Lengkapi salam pagi: Ohayou ___ (gozaimasu)',
          answer: 'gozaimasu',
          options: null,
          translation: 'Selamat pagi formal.',
          explanation: 'Ohayou gozaimasu adalah salam pagi formal.',
        },
      ],
      quizFilename: 'sample_quiz1.csv',
    },
    {
      orderIndex: 2,
      title: 'Bab 2: Mengenal Angka 1-10 (Suuji)',
      description: 'Pelajari pelafalan angka 1 sampai 10 dalam bahasa Jepang.',
      markdownContent: `# Bab 2: Mengenal Angka 1-10

Angka dasar dalam bahasa Jepang:
- 1: Ichi (いち)
- 2: Ni (に)
- 3: San (さん)
- 4: Shi / Yon (よん)
- 5: Go (ご)`,
      markdownFilename: '02_suuji.md',
      quizDurationMinutes: 5,
      flashcards: [
        { front: 'Ichi', back: 'Satu (1)', hint: 'Angka 1', explanation: 'Nomor 1' },
        { front: 'Ni', back: 'Dua (2)', hint: 'Angka 2', explanation: 'Nomor 2' },
      ],
      flashcardFilename: 'sample_fc2.csv',
      questions: [
        {
          type: 'choice',
          question: 'Berapakah angka "San" dalam bahasa Indonesia?',
          answer: '3',
          options: '1|2|3|4',
          translation: 'Angka 3.',
          explanation: 'Ichi=1, Ni=2, San=3.',
        },
      ],
      quizFilename: 'sample_quiz2.csv',
    },
  ]

  courseForm.value.examQuestions = [
    {
      type: 'choice',
      question: 'Manakah salam yang tepat di pagi hari?',
      answer: 'Ohayou gozaimasu',
      options: 'Konnichiwa|Konbanwa|Ohayou gozaimasu|Sayounara',
      translation: 'Selamat pagi.',
      explanation: 'Pagi hari = Ohayou gozaimasu.',
    },
    {
      type: 'choice',
      question: 'Berapakah angka "Ni"?',
      answer: '2',
      options: '1|2|3|5',
      translation: 'Dua.',
      explanation: 'Ni adalah 2.',
    },
    {
      type: 'input',
      question: 'Ketik salam perpisahan "Sayounara":',
      answer: 'Sayounara',
      options: null,
      translation: 'Selamat tinggal.',
      explanation: 'Sayounara berarti selamat tinggal.',
    },
  ]
  courseForm.value.examFilename = 'sample_exam.csv'
}

// File Upload Handlers for Chapters
function handleChapterMarkdownUpload(event: Event, chapter: ChapterDraft) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    chapter.markdownContent = text
    chapter.markdownFilename = file.name
  }
  reader.readAsText(file)
}

function handleChapterFlashcardUpload(event: Event, chapter: ChapterDraft) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    const res = parseFlashcardsCSV(text)
    chapter.flashcards = res.flashcards
    chapter.flashcardFilename = `${file.name} (${res.flashcards.length} kartu)`
  }
  reader.readAsText(file)
}

function handleChapterQuizUpload(event: Event, chapter: ChapterDraft) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    const res = parseQuestionsCSV(text)
    chapter.questions = res.questions
    chapter.quizFilename = `${file.name} (${res.questions.length} soal)`
  }
  reader.readAsText(file)
}

function handleExamQuestionsUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    const res = parseQuestionsCSV(text)
    courseForm.value.examQuestions = res.questions
    courseForm.value.examFilename = `${file.name} (${res.questions.length} soal ujian)`
  }
  reader.readAsText(file)
}

// Submit Full Multi-Chapter Course
async function submitCourse() {
  if (!courseForm.value.title.trim()) {
    alert('Judul kursus wajib diisi.')
    return
  }

  if (courseForm.value.chapters.length === 0) {
    alert('Kursus wajib memiliki setidaknya 1 bab.')
    return
  }

  if (courseForm.value.examQuestions.length === 0) {
    alert('Kursus wajib memiliki soal Ujian Akhir Kelulusan.')
    return
  }

  isSubmittingCourse.value = true

  try {
    const coursePayload = {
      title: courseForm.value.title.trim(),
      level: courseForm.value.level,
      category: courseForm.value.category.trim() || 'Umum',
      targetLanguage: courseForm.value.targetLanguage,
      visibility: courseForm.value.visibility,
      description: courseForm.value.description.trim(),
      examDurationMinutes: Number(courseForm.value.examDurationMinutes) || 15,
      examPassingScore: Number(courseForm.value.examPassingScore) || 80,
      chapters: courseForm.value.chapters.map((chap) => ({
        orderIndex: chap.orderIndex,
        title: chap.title.trim(),
        description: chap.description.trim(),
        markdownContent: chap.markdownContent,
        quizDurationMinutes: chap.quizDurationMinutes,
        questions: chap.questions,
        flashcards: chap.flashcards,
      })),
      examQuestions: courseForm.value.examQuestions,
    }

    const created = await api.courses.create(coursePayload as any)
    await refreshCourses()
    alert(`Kursus "${created.title}" berhasil diterbitkan!`)
    openCourse(created.id)
  } catch (err: any) {
    console.error('Failed to create course:', err)
    alert(err.message || 'Gagal menerbitkan kursus.')
  } finally {
    isSubmittingCourse.value = false
  }
}

// Template Downloads
function downloadQuestionsTemplate() {
  const sample = generateSampleCSVTemplate()
  downloadText('template_soal_lms.csv', sample)
}

function downloadFlashcardsTemplate() {
  const sample = generateSampleFlashcardCSVTemplate()
  downloadText('template_flashcard_lms.csv', sample)
}

function downloadMarkdownTemplate() {
  const sample = generateSampleMarkdownTemplate()
  downloadText('template_materi_lms.md', sample)
}
</script>

<template>
  <div class="space-y-6 pb-16 animate-in fade-in duration-300 max-w-5xl mx-auto">
    <!-- Header Banner -->
    <div class="p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-background to-accent/20 border border-primary/20 space-y-2">
      <div class="flex items-center gap-2">
        <Badge variant="outline" class="bg-primary/10 text-primary border-primary/30 text-xs font-bold gap-1 py-0.5 px-2.5">
          <Sparkles class="size-3.5" />
          <span>Course Multi-Bab Creator Studio</span>
        </Badge>
      </div>
      <h1 class="text-2xl font-black text-foreground">Pembuat Kursus Terpadu</h1>
      <p class="text-xs sm:text-sm text-muted-foreground leading-relaxed">
        Buat dan terbitkan kursus multi-bab dengan alur lengkap: Bab Materi Pembelajaran, Kartu Hafalan Flashcard,
        Kuis Latihan Pemahaman Bab, dan Ujian Akhir Kelulusan Bersertifikat.
      </p>
    </div>

    <!-- Navigation Tabs -->
    <Tabs :model-value="activeManagerTab" class="w-full space-y-6" @update:model-value="activeManagerTab = $event as any">
      <TabsList class="grid grid-cols-3 max-w-md bg-muted/70 p-1 rounded-xl">
        <TabsTrigger value="builder" class="text-xs font-semibold flex items-center gap-1.5">
          <BookOpen class="size-3.5" />
          <span>Builder Kursus</span>
        </TabsTrigger>
        <TabsTrigger value="templates" class="text-xs font-semibold flex items-center gap-1.5">
          <Download class="size-3.5" />
          <span>Unduh Template</span>
        </TabsTrigger>
        <TabsTrigger value="guide" class="text-xs font-semibold flex items-center gap-1.5">
          <HelpCircle class="size-3.5" />
          <span>Panduan Format</span>
        </TabsTrigger>
      </TabsList>

      <!-- TAB 1: BUILDER KURSUS -->
      <TabsContent value="builder" class="space-y-6">
        <!-- 1-Click Sample Button -->
        <div class="flex items-center justify-between p-4 rounded-xl bg-card border border-primary/20">
          <div class="space-y-0.5">
            <h4 class="text-xs font-bold text-foreground">Ingin mencoba langsung tanpa mengetik manual?</h4>
            <p class="text-[11px] text-muted-foreground">Isi form secara otomatis dengan contoh 2 Bab dan 1 Ujian Akhir.</p>
          </div>
          <Button variant="outline" size="sm" class="rounded-xl text-xs gap-1.5 bg-background" @click="loadSampleCourseData">
            <Sparkles class="size-3.5 text-primary" />
            <span>Isi Contoh Kursus 1-Klik</span>
          </Button>
        </div>

        <!-- 1. Kursus Metadata Card -->
        <Card class="p-6 rounded-2xl border border-border/80 space-y-4">
          <h3 class="font-bold text-base text-foreground flex items-center gap-2">
            <BookOpen class="size-4 text-primary" />
            <span>1. Informasi Utama Kursus</span>
          </h3>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5 sm:col-span-2">
              <label class="text-xs font-semibold text-foreground">Judul Kursus *</label>
              <Input v-model="courseForm.title" placeholder="Contoh: Kursus Intensif Bahasa Jerman A1" class="rounded-xl text-xs" />
            </div>

            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Bahasa Target</label>
              <select v-model="courseForm.targetLanguage" class="w-full h-9 px-3 rounded-xl border border-input bg-background text-xs">
                <option v-for="lang in SUPPORTED_LANGUAGES" :key="lang.code" :value="lang.code">
                  {{ lang.flag }} {{ lang.name }}
                </option>
              </select>
            </div>

            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Tingkat Level</label>
              <select v-model="courseForm.level" class="w-full h-9 px-3 rounded-xl border border-input bg-background text-xs">
                <option value="A1">A1 - Pemula Dasar</option>
                <option value="A2">A2 - Dasar Lanjutan</option>
                <option value="B1">B1 - Menengah</option>
                <option value="B2">B2 - Menengah Atas</option>
                <option value="C1">C1 - Mahir</option>
              </select>
            </div>

            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Kategori Kursus</label>
              <Input v-model="courseForm.category" placeholder="Contoh: Grammatik, Dialog, Bisnis" class="rounded-xl text-xs" />
            </div>

            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Visibilitas Publikasi</label>
              <select v-model="courseForm.visibility" class="w-full h-9 px-3 rounded-xl border border-input bg-background text-xs">
                <option value="public">Publik (Terlihat di Katalog)</option>
                <option value="private">Privat (Hanya Saya)</option>
              </select>
            </div>

            <div class="space-y-1.5 sm:col-span-2">
              <label class="text-xs font-semibold text-foreground">Deskripsi Ringkas Kursus</label>
              <textarea
                v-model="courseForm.description"
                rows="2"
                placeholder="Jelaskan secara ringkas kompetensi yang didapatkan siswa setelah menyelesaikan kursus ini..."
                class="w-full p-2.5 rounded-xl border border-input bg-background text-xs focus:outline-hidden"
              ></textarea>
            </div>
          </div>
        </Card>

        <!-- 2. Chapters Builder List -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-base text-foreground flex items-center gap-2">
              <Layers class="size-4 text-primary" />
              <span>2. Bab Pembelajaran ({{ courseForm.chapters.length }} Bab)</span>
            </h3>

            <Button variant="outline" size="sm" class="rounded-xl text-xs gap-1.5" @click="addNewChapter">
              <PlusCircle class="size-3.5" />
              <span>Tambah Bab Baru</span>
            </Button>
          </div>

          <!-- Chapter Cards -->
          <Card
            v-for="(chap, idx) in courseForm.chapters"
            :key="idx"
            class="p-6 rounded-2xl border border-border/80 space-y-4 relative"
          >
            <div class="flex items-center justify-between">
              <Badge variant="outline" class="text-xs font-bold bg-primary/10 text-primary border-primary/20">
                BAB {{ chap.orderIndex }}
              </Badge>
              <button
                class="text-muted-foreground hover:text-rose-500 text-xs flex items-center gap-1"
                @click="removeChapter(idx)"
              >
                <Trash2 class="size-3.5" />
                <span>Hapus Bab</span>
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="space-y-1 sm:col-span-2">
                <label class="text-xs font-semibold text-foreground">Judul Bab *</label>
                <Input v-model="chap.title" placeholder="Contoh: Bab 1: Mengenal Artikel Kata Benda" class="rounded-xl text-xs" />
              </div>

              <div class="space-y-1 sm:col-span-2">
                <label class="text-xs font-semibold text-foreground">Deskripsi Singkat Bab</label>
                <Input v-model="chap.description" placeholder="Penjelasan ringkas isi bab..." class="rounded-xl text-xs" />
              </div>
            </div>

            <!-- Uploads Grid for this chapter -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/50 text-xs">
              <!-- Upload Markdown -->
              <div class="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                <div class="font-bold text-foreground flex items-center gap-1.5">
                  <FileText class="size-3.5 text-primary" />
                  <span>Materi (.md)</span>
                </div>
                <input type="file" accept=".md,.markdown" class="text-[11px] w-full" @change="handleChapterMarkdownUpload($event, chap)" />
                <div v-if="chap.markdownFilename" class="text-[10px] text-emerald-600 font-medium truncate">
                  ✓ {{ chap.markdownFilename }}
                </div>
              </div>

              <!-- Upload Flashcards CSV -->
              <div class="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                <div class="font-bold text-foreground flex items-center gap-1.5">
                  <Layers class="size-3.5 text-primary" />
                  <span>Flashcard (.csv)</span>
                </div>
                <input type="file" accept=".csv" class="text-[11px] w-full" @change="handleChapterFlashcardUpload($event, chap)" />
                <div v-if="chap.flashcardFilename" class="text-[10px] text-emerald-600 font-medium truncate">
                  ✓ {{ chap.flashcardFilename }}
                </div>
              </div>

              <!-- Upload Quiz CSV -->
              <div class="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                <div class="font-bold text-foreground flex items-center gap-1.5">
                  <HelpCircle class="size-3.5 text-primary" />
                  <span>Kuis Bab (.csv)</span>
                </div>
                <input type="file" accept=".csv" class="text-[11px] w-full" @change="handleChapterQuizUpload($event, chap)" />
                <div v-if="chap.quizFilename" class="text-[10px] text-emerald-600 font-medium truncate">
                  ✓ {{ chap.quizFilename }}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <!-- 3. Final Exam Bank Card -->
        <Card class="p-6 rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-base text-foreground flex items-center gap-2">
              <Award class="size-5 text-amber-500" />
              <span>3. Bank Soal Ujian Akhir Kelulusan Bersertifikat</span>
            </h3>
            <Badge variant="outline" class="text-xs bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40">
              Wajib untuk Sertifikat
            </Badge>
          </div>

          <p class="text-xs text-muted-foreground leading-relaxed">
            Soal-soal ini akan dikerjakan siswa di akhir kursus dengan batas waktu ujian. Jika siswa mencapai passing score,
            sertifikat resmi digital akan diterbitkan otomatis.
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Durasi Ujian Akhir (Menit)</label>
              <Input v-model="courseForm.examDurationMinutes" type="number" min="5" max="120" class="rounded-xl text-xs bg-background" />
            </div>

            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Minimal Skor Lulus (%)</label>
              <Input v-model="courseForm.examPassingScore" type="number" min="50" max="100" class="rounded-xl text-xs bg-background" />
            </div>

            <div class="space-y-1.5 sm:col-span-2">
              <label class="text-xs font-semibold text-foreground">Upload File CSV Bank Soal Ujian Akhir *</label>
              <input type="file" accept=".csv" class="w-full text-xs p-2 rounded-xl border border-input bg-background" @change="handleExamQuestionsUpload" />
              <div v-if="courseForm.examFilename" class="text-xs text-emerald-600 font-bold pt-1">
                ✓ Berhasil dimuat: {{ courseForm.examFilename }}
              </div>
            </div>
          </div>
        </Card>

        <!-- Final Submit Button -->
        <div class="flex justify-end pt-4">
          <Button
            variant="default"
            size="lg"
            class="gap-2 font-bold rounded-xl shadow-md px-8"
            :disabled="isSubmittingCourse"
            @click="submitCourse"
          >
            <Loader2 v-if="isSubmittingCourse" class="size-4 animate-spin" />
            <UploadCloud v-else class="size-4" />
            <span>Terbitkan Kursus Lengkap</span>
          </Button>
        </div>
      </TabsContent>

      <!-- TAB 2: TEMPLATE DOWNLOADS -->
      <TabsContent value="templates" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card class="p-5 rounded-2xl border border-border/80 space-y-3">
            <FileSpreadsheet class="size-8 text-primary" />
            <h4 class="font-bold text-sm text-foreground">Template Soal Kuis & Ujian</h4>
            <p class="text-xs text-muted-foreground">Format CSV untuk soal pilihan ganda, isian, dan susun kata.</p>
            <Button variant="outline" size="sm" class="w-full rounded-xl text-xs gap-1.5" @click="downloadQuestionsTemplate">
              <Download class="size-3.5" />
              <span>Unduh CSV Soal</span>
            </Button>
          </Card>

          <Card class="p-5 rounded-2xl border border-border/80 space-y-3">
            <Layers class="size-8 text-primary" />
            <h4 class="font-bold text-sm text-foreground">Template Flashcard Kosakata</h4>
            <p class="text-xs text-muted-foreground">Format CSV untuk kartu hafalan kosakata dan petunjuk arti.</p>
            <Button variant="outline" size="sm" class="w-full rounded-xl text-xs gap-1.5" @click="downloadFlashcardsTemplate">
              <Download class="size-3.5" />
              <span>Unduh CSV Flashcard</span>
            </Button>
          </Card>

          <Card class="p-5 rounded-2xl border border-border/80 space-y-3">
            <FileText class="size-8 text-primary" />
            <h4 class="font-bold text-sm text-foreground">Template Materi Markdown</h4>
            <p class="text-xs text-muted-foreground">Format teks Markdown standar untuk modul pembelajaran materi bab.</p>
            <Button variant="outline" size="sm" class="w-full rounded-xl text-xs gap-1.5" @click="downloadMarkdownTemplate">
              <Download class="size-3.5" />
              <span>Unduh File .md</span>
            </Button>
          </Card>
        </div>
      </TabsContent>

      <!-- TAB 3: GUIDES -->
      <TabsContent value="guide" class="space-y-4">
        <Card class="p-6 rounded-2xl border border-border/80 space-y-4 text-xs leading-relaxed">
          <h3 class="font-bold text-base text-foreground">Panduan Kolom CSV Soal & Kuis</h3>
          <div class="overflow-x-auto">
            <table class="w-full border-collapse">
              <thead>
                <tr class="border-b text-left text-muted-foreground">
                  <th class="p-2">Kolom</th>
                  <th class="p-2">Wajib?</th>
                  <th class="p-2">Keterangan</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/50">
                <tr>
                  <td class="p-2 font-mono font-bold">type</td>
                  <td class="p-2 text-rose-500">Ya</td>
                  <td class="p-2">'choice' (pilihan ganda), 'input' (isian kata), atau 'sentence' (susun kalimat)</td>
                </tr>
                <tr>
                  <td class="p-2 font-mono font-bold">question</td>
                  <td class="p-2 text-rose-500">Ya</td>
                  <td class="p-2">Kalimat pertanyaan yang ditampilkan</td>
                </tr>
                <tr>
                  <td class="p-2 font-mono font-bold">answer</td>
                  <td class="p-2 text-rose-500">Ya</td>
                  <td class="p-2">Kunci jawaban benar</td>
                </tr>
                <tr>
                  <td class="p-2 font-mono font-bold">options</td>
                  <td class="p-2">Khusus choice</td>
                  <td class="p-2">Pilihan jawaban dipisahkan tanda pipa '|' (contoh: 'der|die|das')</td>
                </tr>
                <tr>
                  <td class="p-2 font-mono font-bold">translation</td>
                  <td class="p-2 text-rose-500">Ya</td>
                  <td class="p-2">Arti/terjemahan bahasa Indonesia</td>
                </tr>
                <tr>
                  <td class="p-2 font-mono font-bold">explanation</td>
                  <td class="p-2 text-muted-foreground">Opsional</td>
                  <td class="p-2">Penjelasan tata bahasa saat pembahasan</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</template>
