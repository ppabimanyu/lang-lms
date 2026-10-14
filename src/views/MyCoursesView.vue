<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  courses,
  openCourse,
  refreshCourses,
  toggleCourseVisibility,
  removeCourse,
  activeTab
} from '@/lib/storage'
import type { Course } from '@/types'
import { findLanguageInfo } from '@/lib/tts'
import EditCourseDialog from '@/components/courses/EditCourseDialog.vue'
import { Card, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  FolderGit2,
  Search,
  BookOpen,
  Sparkles,
  Globe,
  Lock,
  Star,
  Timer,
  Settings2,
  Trash2,
  ArrowRight,
  PlusCircle,
  AlertTriangle
} from '@lucide/vue'

const searchQuery = ref('')
const selectedVisibility = ref<'all' | 'public' | 'private'>('all')
const selectedLevel = ref('all')
const sortBy = ref<'latest' | 'popular' | 'level'>('latest')

const isTogglingVisibility = ref<string | null>(null)
const isDeletingCourse = ref<string | null>(null)
const courseToDelete = ref<Course | null>(null)
const isConfirmDeleteOpen = ref(false)

// Edit Dialog state
const isEditDialogOpen = ref(false)
const selectedCourseForEdit = ref<Course | null>(null)

onMounted(() => {
  refreshCourses()
})

// Filter only courses owned by the current logged-in user
const myCourses = computed(() => {
  return courses.value.filter(c => c.isOwner)
})

// Metrics for the summary strip
const stats = computed(() => {
  const total = myCourses.value.length
  const publicCount = myCourses.value.filter(c => c.visibility === 'public').length
  const privateCount = myCourses.value.filter(c => c.visibility === 'private').length
  const totalQuestions = myCourses.value.reduce((acc, c) => acc + (c.examQuestionsCount || 0), 0)
  return { total, publicCount, privateCount, totalQuestions }
})

// Filtered & sorted courses
const filteredCourses = computed(() => {
  let list = [...myCourses.value]

  // Visibility filter
  if (selectedVisibility.value !== 'all') {
    list = list.filter(c => c.visibility === selectedVisibility.value)
  }

  // Level filter
  if (selectedLevel.value !== 'all') {
    list = list.filter(c => c.level.toLowerCase() === selectedLevel.value.toLowerCase())
  }

  // Search filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(
      c =>
        c.title.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    )
  }

  // Sort
  if (sortBy.value === 'popular') {
    list.sort((a, b) => (b.totalReviews || 0) - (a.totalReviews || 0))
  } else if (sortBy.value === 'level') {
    list.sort((a, b) => a.level.localeCompare(b.level))
  } else {
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  return list
})

async function handleVisibilityToggle(course: Course) {
  isTogglingVisibility.value = course.id
  const nextVisibility = course.visibility === 'public' ? 'private' : 'public'
  try {
    await toggleCourseVisibility(course.id, nextVisibility)
  } catch (err) {
    console.error('Failed to toggle visibility:', err)
  } finally {
    isTogglingVisibility.value = null
  }
}

function handleOpenEdit(course: Course) {
  selectedCourseForEdit.value = course
  isEditDialogOpen.value = true
}

function handleCourseSaved(_updated: Course) {
  // Local list is updated reactively via storage
  refreshCourses()
}

function confirmDelete(course: Course) {
  courseToDelete.value = course
  isConfirmDeleteOpen.value = true
}

async function executeDelete() {
  if (!courseToDelete.value) return
  const id = courseToDelete.value.id
  isDeletingCourse.value = id
  try {
    await removeCourse(id)
    isConfirmDeleteOpen.value = false
    courseToDelete.value = null
  } catch (err) {
    console.error('Failed to delete course:', err)
  } finally {
    isDeletingCourse.value = null
  }
}
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
    <!-- Header Banner -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <Badge variant="outline" class="gap-1 border-primary/30 text-primary bg-primary/5 text-xs font-medium">
            <FolderGit2 class="size-3" />
            <span>Manajemen Pembuat</span>
          </Badge>
          <span class="text-xs text-muted-foreground">• {{ myCourses.length }} Kursus Anda</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Kursus Saya
        </h1>
        <p class="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
          Kelola kursus buatan Anda sendiri: atur visibilitas akses publik/privat, perbarui judul dan deskripsi, serta sesuaikan durasi batas waktu tantangan kuis.
        </p>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          class="font-semibold gap-1.5 shadow-sm"
          @click="activeTab = 'manager'"
        >
          <PlusCircle class="size-4" />
          <span>Buat Kursus Baru</span>
        </Button>
      </div>
    </div>

    <!-- Metrics Summary Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="p-3.5 rounded-xl border border-border/70 bg-card/60 shadow-2xs space-y-1">
        <div class="text-[11px] font-medium text-muted-foreground">Total Kursus</div>
        <div class="text-2xl font-extrabold tracking-tight text-foreground">{{ stats.total }}</div>
        <div class="text-[10px] text-muted-foreground">Materi buatan Anda</div>
      </div>

      <div class="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/10 shadow-2xs space-y-1">
        <div class="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <Globe class="size-3" />
          <span>Kursus Publik</span>
        </div>
        <div class="text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">{{ stats.publicCount }}</div>
        <div class="text-[10px] text-muted-foreground">Tersedia di Katalog</div>
      </div>

      <div class="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/10 shadow-2xs space-y-1">
        <div class="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <Lock class="size-3" />
          <span>Kursus Privat</span>
        </div>
        <div class="text-2xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400">{{ stats.privateCount }}</div>
        <div class="text-[10px] text-muted-foreground">Akses terbatas pemilik</div>
      </div>

      <div class="p-3.5 rounded-xl border border-primary/20 bg-primary/5 shadow-2xs space-y-1">
        <div class="text-[11px] font-medium text-primary flex items-center gap-1">
          <Sparkles class="size-3" />
          <span>Total Pertanyaan</span>
        </div>
        <div class="text-2xl font-extrabold tracking-tight text-primary">{{ stats.totalQuestions }}</div>
        <div class="text-[10px] text-muted-foreground">Butir latihan terdaftar</div>
      </div>
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="p-3.5 rounded-xl border border-border/80 bg-card space-y-3 shadow-2xs">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <!-- Search Input -->
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="Cari kursus saya berdasarkan judul, kategori, atau deskripsi..."
            class="pl-9 h-9 text-xs"
          />
        </div>

        <!-- Filter Dropdowns -->
        <div class="flex flex-wrap items-center gap-2 shrink-0">
          <!-- Visibility Selector -->
          <div class="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/60 text-xs">
            <button
              @click="selectedVisibility = 'all'"
              :class="[
                'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                selectedVisibility === 'all'
                  ? 'bg-background text-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              ]"
            >
              Semua ({{ stats.total }})
            </button>
            <button
              @click="selectedVisibility = 'public'"
              :class="[
                'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1',
                selectedVisibility === 'public'
                  ? 'bg-background text-emerald-600 dark:text-emerald-400 shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              ]"
            >
              <Globe class="size-3 text-emerald-500" />
              <span>Publik</span>
            </button>
            <button
              @click="selectedVisibility = 'private'"
              :class="[
                'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1',
                selectedVisibility === 'private'
                  ? 'bg-background text-amber-600 dark:text-amber-400 shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              ]"
            >
              <Lock class="size-3 text-amber-500" />
              <span>Privat</span>
            </button>
          </div>

          <!-- Level Filter -->
          <select
            v-model="selectedLevel"
            class="h-8 rounded-lg border border-border bg-background px-2.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">Semua Level</option>
            <option value="A1">Level A1</option>
            <option value="A2">Level A2</option>
            <option value="B1">Level B1</option>
            <option value="B2">Level B2</option>
          </select>

          <!-- Sort -->
          <select
            v-model="sortBy"
            class="h-8 rounded-lg border border-border bg-background px-2.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="latest">Terbaru</option>
            <option value="popular">Terpopuler</option>
            <option value="level">Level</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Course Cards Grid -->
    <div v-if="filteredCourses.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card
        v-for="course in filteredCourses"
        :key="course.id"
        class="border-border/80 bg-card hover:border-primary/40 transition-all duration-200 flex flex-col justify-between overflow-hidden group shadow-2xs hover:shadow-md"
      >
        <div class="p-5 space-y-3.5">
          <!-- Top Tag Strip -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5 flex-wrap">
              <Badge class="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 text-[11px] font-semibold px-2 py-0.5">
                {{ course.level }}
              </Badge>
              <Badge variant="outline" class="text-[11px] text-muted-foreground border-border/80 px-2 py-0.5">
                {{ course.category }}
              </Badge>
              <span class="text-xs" :title="findLanguageInfo(course.targetLanguage).name">
                {{ findLanguageInfo(course.targetLanguage).flag }}
              </span>
            </div>

            <!-- Visibility Quick Toggle Button -->
            <button
              @click.stop="handleVisibilityToggle(course)"
              :disabled="isTogglingVisibility === course.id"
              :class="[
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all',
                course.visibility === 'public'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
              ]"
              :title="course.visibility === 'public' ? 'Klik untuk jadikan Privat' : 'Klik untuk jadikan Publik'"
            >
              <component :is="course.visibility === 'public' ? Globe : Lock" class="size-3" />
              <span>{{ course.visibility === 'public' ? 'Publik' : 'Privat' }}</span>
            </button>
          </div>

          <!-- Title & Description -->
          <div class="space-y-1">
            <h3
              class="font-bold text-base text-foreground leading-snug group-hover:text-primary transition-colors cursor-pointer"
              @click="openCourse(course.id)"
            >
              {{ course.title }}
            </h3>
            <p class="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {{ course.description || 'Tidak ada deskripsi kursus.' }}
            </p>
          </div>

          <!-- Metadata Tags Strip (Ujian, Soal, Bab) -->
          <div class="grid grid-cols-2 gap-2 pt-1 border-t border-border/50 text-[11px]">
            <!-- Timer Badge -->
            <div class="flex items-center gap-1.5 text-muted-foreground bg-muted/40 px-2 py-1 rounded-md">
              <Timer class="size-3.5 text-amber-500 shrink-0" />
              <span>Ujian: <strong class="text-foreground font-mono">{{ course.examDurationMinutes || 15 }}m</strong></span>
            </div>

            <!-- Exam Questions Count -->
            <div class="flex items-center gap-1.5 text-muted-foreground bg-muted/40 px-2 py-1 rounded-md">
              <Sparkles class="size-3.5 text-primary shrink-0" />
              <span>Ujian: <strong class="text-foreground font-mono">{{ course.examQuestionsCount || 0 }}</strong> soal</span>
            </div>

            <!-- Total Chapters -->
            <div class="flex items-center gap-1.5 text-muted-foreground bg-muted/40 px-2 py-1 rounded-md">
              <BookOpen class="size-3.5 text-blue-500 shrink-0" />
              <span>{{ course.totalChapters || 0 }} Bab Pembelajaran</span>
            </div>

            <!-- Review / Rating -->
            <div class="flex items-center gap-1.5 text-muted-foreground bg-muted/40 px-2 py-1 rounded-md">
              <Star class="size-3.5 text-amber-400 fill-amber-400 shrink-0" />
              <span>{{ (course.avgRating || 5.0).toFixed(1) }} ({{ course.totalReviews || 0 }})</span>
            </div>
          </div>
        </div>

        <!-- Card Footer Actions -->
        <CardFooter class="p-3 bg-muted/20 border-t border-border/60 flex items-center justify-between gap-2">
          <div class="flex items-center gap-1">
            <!-- Edit Metadata Button -->
            <Button
              size="sm"
              variant="outline"
              class="h-8 px-2.5 text-xs gap-1 font-medium hover:border-primary/50"
              @click="handleOpenEdit(course)"
              title="Edit judul, visibilitas & timer kuis"
            >
              <Settings2 class="size-3.5 text-primary" />
              <span>Edit Metadata</span>
            </Button>

            <!-- Delete Button -->
            <Button
              size="sm"
              variant="ghost"
              class="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              @click="confirmDelete(course)"
              title="Hapus kursus ini"
            >
              <Trash2 class="size-3.5" />
            </Button>
          </div>

          <!-- Open Course Button -->
          <Button
            size="sm"
            class="h-8 text-xs font-semibold gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
            @click="openCourse(course.id)"
          >
            <span>Buka Kursus</span>
            <ArrowRight class="size-3" />
          </Button>
        </CardFooter>
      </Card>
    </div>

    <!-- Empty State (When user has 0 courses) -->
    <div
      v-else-if="myCourses.length === 0"
      class="p-12 text-center rounded-2xl border border-dashed border-border bg-card/40 max-w-xl mx-auto space-y-4"
    >
      <div class="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20 shadow-sm">
        <FolderGit2 class="size-8" />
      </div>
      <div class="space-y-1.5">
        <h3 class="text-lg font-bold text-foreground">Belum Ada Kursus Buatan Anda</h3>
        <p class="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
          Anda belum mengunggah atau membuat kursus sendiri. Buat modul terpadu berisi materi bacaan Markdown dan kuis CSV untuk mulai mengajar atau belajar secara personal!
        </p>
      </div>
      <div class="pt-2">
        <Button
          class="font-semibold gap-2 shadow-sm"
          @click="activeTab = 'manager'"
        >
          <PlusCircle class="size-4" />
          <span>Buat & Impor Kursus Pertama</span>
        </Button>
      </div>
    </div>

    <!-- Empty Filter Search Result -->
    <div
      v-else
      class="p-12 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-3"
    >
      <Search class="size-10 text-muted-foreground mx-auto opacity-50" />
      <div class="text-sm font-semibold text-foreground">Tidak Ada Kursus yang Sesuai Filter</div>
      <p class="text-xs text-muted-foreground">
        Coba ubah kata kunci pencarian atau reset filter visibilitas dan level.
      </p>
      <Button
        variant="outline"
        size="sm"
        @click="searchQuery = ''; selectedVisibility = 'all'; selectedLevel = 'all'"
      >
        Reset Filter
      </Button>
    </div>

    <!-- Modal Dialog: Edit Metadata Kursus -->
    <EditCourseDialog
      :open="isEditDialogOpen"
      :course="selectedCourseForEdit"
      @update:open="isEditDialogOpen = $event"
      @saved="handleCourseSaved"
    />

    <!-- Confirmation Modal: Hapus Kursus -->
    <div
      v-if="isConfirmDeleteOpen && courseToDelete"
      class="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
    >
      <div class="bg-card border border-border p-6 rounded-2xl max-w-md w-full space-y-4 shadow-xl animate-in zoom-in-95">
        <div class="flex items-center gap-3">
          <div class="size-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0 border border-destructive/20">
            <AlertTriangle class="size-5" />
          </div>
          <div>
            <h4 class="font-bold text-sm text-foreground">Hapus Kursus Ini?</h4>
            <p class="text-xs text-muted-foreground">Tindakan ini permanen dan tidak dapat dibatalkan.</p>
          </div>
        </div>

        <p class="text-xs text-muted-foreground leading-relaxed bg-muted/40 p-3 rounded-lg border border-border/60">
          Kursus <strong class="text-foreground">"{{ courseToDelete.title }}"</strong> beserta seluruh butir latihan soal dan riwayat pembelajarannya akan dihapus dari server.
        </p>

        <div class="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            @click="isConfirmDeleteOpen = false; courseToDelete = null"
            :disabled="!!isDeletingCourse"
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            size="sm"
            class="font-semibold gap-1.5"
            @click="executeDelete"
            :disabled="!!isDeletingCourse"
          >
            <Trash2 class="size-3.5" />
            <span>{{ isDeletingCourse ? 'Menghapus...' : 'Ya, Hapus Kursus' }}</span>
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
