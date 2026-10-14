<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  courses,
  currentUser,
  openCourse,
  refreshCourses,
  toggleCourseBookmark,
  activeTab,
  openUserProfile,
} from '@/lib/storage'
import { isFeatureEnabled } from '@/lib/featureFlags'
import { SUPPORTED_LANGUAGES, findLanguageInfo } from '@/lib/tts'
import { Card, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  GraduationCap,
  Search,
  BookOpen,
  Sparkles,
  Lock,
  Globe,
  Star,
  Bookmark,
  CheckCircle2,
  Award,
  ArrowRight,
  PlusCircle,
  FolderGit2,
} from '@lucide/vue'

const activeFilterTab = ref<'all' | 'favorites' | 'history'>('all')
const searchQuery = ref('')
const selectedLanguage = ref('all')
const selectedLevel = ref('all')
const sortBy = ref<'latest' | 'popular' | 'level'>('latest')
const isTogglingBookmark = ref<string | null>(null)

function getAuthorInitial(name?: string): string {
  if (!name) return 'L'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getLevelBadgeClass(level?: string) {
  switch (level?.toUpperCase()) {
    case 'A1':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    case 'A2':
      return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
    case 'B1':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    case 'B2':
      return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
    case 'C1':
    case 'C2':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

onMounted(() => {
  refreshCourses()
})

const filteredCourses = computed(() => {
  let list = [...courses.value]

  // Filter Tab
  if (activeFilterTab.value === 'favorites') {
    list = list.filter((c) => c.isBookmarked)
  } else if (activeFilterTab.value === 'history') {
    list = list.filter((c) => (c.progressPercent || 0) > 0 || c.isExamPassed)
  }

  // Language filter
  if (selectedLanguage.value !== 'all') {
    list = list.filter((c) => c.targetLanguage.toLowerCase() === selectedLanguage.value.toLowerCase())
  }

  // Level filter
  if (selectedLevel.value !== 'all') {
    list = list.filter((c) => c.level.toUpperCase() === selectedLevel.value.toUpperCase())
  }

  // Search
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        c.category.toLowerCase().includes(q) ||
        (c.author?.name && c.author.name.toLowerCase().includes(q))
    )
  }

  // Sort
  if (sortBy.value === 'popular') {
    list.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0))
  } else if (sortBy.value === 'level') {
    list.sort((a, b) => a.level.localeCompare(b.level))
  }

  return list
})

async function handleToggleBookmark(e: Event, courseId: string) {
  e.stopPropagation()
  if (isTogglingBookmark.value) return
  isTogglingBookmark.value = courseId
  try {
    await toggleCourseBookmark(courseId)
  } finally {
    isTogglingBookmark.value = null
  }
}
</script>

<template>
  <div class="space-y-6 pb-12 animate-in fade-in duration-300 max-w-7xl mx-auto">
    <!-- Top Hero Banner -->
    <div
      class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-background to-accent/20 border border-primary/20 p-6 sm:p-8 shadow-sm"
    >
      <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="space-y-2 max-w-2xl">
          <div class="flex items-center gap-2">
            <Badge
              variant="outline"
              class="bg-primary/10 text-primary border-primary/30 gap-1.5 text-xs font-semibold py-0.5 px-2.5"
            >
              <Sparkles class="size-3.5" />
              <span>Jalur Pembelajaran Multi-Bab Terstruktur</span>
            </Badge>
            <Badge
              variant="outline"
              class="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs font-medium py-0.5 px-2.5 gap-1"
            >
              <Award class="size-3.5" />
              <span>Sertifikat Kelulusan Resmi</span>
            </Badge>
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Katalog Kursus Bahasa Terakreditasi
          </h1>
          <p class="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Setiap kursus disusun bertahap mulai dari Bab Materi, Hafalan Flashcard Kosakata, Kuis Latihan Pemahaman,
            dan diakhiri dengan <strong>Ujian Akhir Kelulusan</strong> untuk meraih sertifikat digital resmi.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3 shrink-0">
          <Button
            v-if="isFeatureEnabled('enable_course_creation')"
            variant="default"
            class="shadow-sm gap-2 rounded-xl"
            @click="activeTab = 'manager'"
          >
            <PlusCircle class="size-4" />
            <span>Buat Kursus Baru</span>
          </Button>
          <Button
            variant="outline"
            class="gap-2 rounded-xl bg-background/80 hover:bg-accent/40"
            @click="activeTab = 'my-courses'"
          >
            <FolderGit2 class="size-4" />
            <span>Kursus Saya</span>
          </Button>
        </div>
      </div>
    </div>

    <!-- Filter & Search Bar Controls -->
    <div
      class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border/70 shadow-2xs"
    >
      <!-- Sub-Tabs: Semua / Favorit / Riwayat -->
      <Tabs :model-value="activeFilterTab" class="w-full lg:w-auto" @update:model-value="activeFilterTab = $event as any">
        <TabsList class="grid grid-cols-3 w-full lg:w-auto bg-muted/70 p-1">
          <TabsTrigger value="all" class="text-xs font-medium">Semua Kursus</TabsTrigger>
          <TabsTrigger value="favorites" class="text-xs font-medium flex items-center gap-1.5">
            <Bookmark class="size-3.5" />
            <span>Favorit</span>
          </TabsTrigger>
          <TabsTrigger value="history" class="text-xs font-medium flex items-center gap-1.5">
            <CheckCircle2 class="size-3.5" />
            <span>Sedang Dipelajari</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <!-- Search & Filters -->
      <div class="flex flex-wrap items-center gap-2.5 flex-1 lg:max-w-2xl justify-end">
        <!-- Search Input -->
        <div class="relative flex-1 min-w-[200px]">
          <Search class="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            v-model="searchQuery"
            placeholder="Cari kursus, topik tata bahasa, atau instruktur..."
            class="pl-9 h-9 text-xs rounded-lg bg-background"
          />
        </div>

        <!-- Language Selector -->
        <select
          v-model="selectedLanguage"
          class="h-9 px-2.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
        >
          <option value="all">🌐 Semua Bahasa</option>
          <option v-for="lang in SUPPORTED_LANGUAGES" :key="lang.code" :value="lang.code">
            {{ lang.flag }} {{ lang.name }}
          </option>
        </select>

        <!-- Level Selector -->
        <select
          v-model="selectedLevel"
          class="h-9 px-2.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
        >
          <option value="all">📊 Semua Level</option>
          <option value="A1">A1 - Pemula Dasar</option>
          <option value="A2">A2 - Dasar Lanjutan</option>
          <option value="B1">B1 - Menengah</option>
          <option value="B2">B2 - Menengah Atas</option>
          <option value="C1">C1 - Lanjutan</option>
        </select>

        <!-- Sort -->
        <select
          v-model="sortBy"
          class="h-9 px-2.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
        >
          <option value="latest">Terbaru</option>
          <option value="popular">Rating Tertinggi</option>
          <option value="level">Tingkat Level</option>
        </select>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="filteredCourses.length === 0"
      class="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-border/80 bg-card/40 space-y-3"
    >
      <div class="size-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
        <GraduationCap class="size-6" />
      </div>
      <h3 class="font-semibold text-base text-foreground">Tidak Ada Kursus yang Ditemukan</h3>
      <p class="text-xs text-muted-foreground max-w-sm">
        Tidak ada kursus yang cocok dengan kata kunci pencarian atau filter yang Anda pilih.
      </p>
      <Button
        variant="outline"
        size="sm"
        class="mt-2 text-xs"
        @click="
          () => {
            searchQuery = ''
            selectedLanguage = 'all'
            selectedLevel = 'all'
            activeFilterTab = 'all'
          }
        "
      >
        Reset Filter
      </Button>
    </div>

    <!-- Courses Grid (Multi-Chapter Tracks) -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card
        v-for="course in filteredCourses"
        :key="course.id"
        class="group flex flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card hover:border-primary/40 hover:shadow-lg transition-all duration-200 cursor-pointer"
        @click="openCourse(course.id)"
      >
        <!-- Card Top Details -->
        <div class="p-5 space-y-4">
          <!-- Top Badges Row -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5 flex-wrap">
              <!-- Language Badge -->
              <Badge variant="outline" class="text-[11px] font-medium py-0.5 px-2 bg-background/80 border-border/80">
                <span class="mr-1">{{ findLanguageInfo(course.targetLanguage)?.flag || '🌐' }}</span>
                <span>{{ findLanguageInfo(course.targetLanguage)?.name || course.targetLanguage }}</span>
              </Badge>

              <!-- Level Badge -->
              <Badge variant="outline" :class="getLevelBadgeClass(course.level)" class="text-[11px] font-semibold py-0.5 px-2">
                {{ course.level }}
              </Badge>

              <!-- Visibility Badge (if owner) -->
              <Badge
                v-if="course.isOwner"
                variant="outline"
                class="text-[10px] py-0 px-1.5 gap-1"
                :class="
                  course.visibility === 'public'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-muted text-muted-foreground'
                "
              >
                <Globe v-if="course.visibility === 'public'" class="size-2.5" />
                <Lock v-else class="size-2.5" />
                <span>{{ course.visibility === 'public' ? 'Publik' : 'Privat' }}</span>
              </Badge>
            </div>

            <!-- Bookmark Button -->
            <button
              class="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
              :class="{ 'text-amber-500 bg-amber-500/10': course.isBookmarked }"
              :disabled="isTogglingBookmark === course.id"
              title="Simpan ke Favorit"
              @click="handleToggleBookmark($event, course.id)"
            >
              <Bookmark class="size-4" :class="{ 'fill-amber-500': course.isBookmarked }" />
            </button>
          </div>

          <!-- Title & Category -->
          <div class="space-y-1.5">
            <div class="flex items-center gap-1.5 text-[11px] font-medium text-primary uppercase tracking-wider">
              <span>{{ course.category }}</span>
            </div>
            <h3
              class="font-bold text-base text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors"
            >
              {{ course.title }}
            </h3>
            <p class="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {{ course.description || 'Tidak ada deskripsi kursus.' }}
            </p>
          </div>

          <!-- Author Info -->
          <div
            v-if="course.author"
            class="flex items-center gap-2 pt-1 pb-1 cursor-pointer hover:opacity-80 transition-opacity"
            @click.stop="course.author?.id && openUserProfile(course.author.id)"
          >
            <div
              class="size-6 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center text-[10px] font-bold"
            >
              {{ getAuthorInitial(course.author.name) }}
            </div>
            <div class="flex items-center gap-1.5 text-xs truncate">
              <span class="font-medium text-foreground truncate">{{ course.author.name }}</span>
              <Badge
                v-if="course.author.isOfficial"
                variant="outline"
                class="text-[9px] py-0 px-1 bg-primary/10 text-primary border-primary/20 shrink-0"
              >
                Resmi
              </Badge>
            </div>
          </div>

          <!-- Course Structure Metrics -->
          <div class="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs">
            <div class="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
              <BookOpen class="size-4 text-primary shrink-0" />
              <div class="truncate">
                <div class="font-bold text-foreground">{{ course.totalChapters || 0 }} Bab</div>
                <div class="text-[10px] text-muted-foreground">Materi & Kuis</div>
              </div>
            </div>

            <div class="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
              <Award class="size-4 text-amber-500 shrink-0" />
              <div class="truncate">
                <div class="font-bold text-foreground">{{ course.examQuestionsCount || 0 }} Soal</div>
                <div class="text-[10px] text-muted-foreground">Ujian Akhir ({{ course.examDurationMinutes }}m)</div>
              </div>
            </div>
          </div>

          <!-- Progress Bar (shown for all courses if user is logged in) -->
          <div v-if="currentUser" class="space-y-1.5 pt-1">
            <div class="flex items-center justify-between text-xs font-medium">
              <span class="text-muted-foreground">Progres Belajar</span>
              <span
                :class="
                  course.isExamPassed
                    ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                    : (course.progressPercent || 0) > 0
                    ? 'text-primary font-bold'
                    : 'text-muted-foreground font-medium'
                "
              >
                {{
                  course.isExamPassed
                    ? '🏆 Lulus Bersertifikat'
                    : (course.progressPercent || 0) > 0
                    ? `${course.progressPercent}% Selesai`
                    : '0% Belum Dimulai'
                }}
              </span>
            </div>
            <Progress :model-value="course.isExamPassed ? 100 : course.progressPercent || 0" class="h-2 rounded-full" />
          </div>
        </div>

        <!-- Card Footer -->
        <CardFooter
          class="p-4 pt-3 border-t border-border/60 bg-muted/20 flex items-center justify-between gap-3 text-xs"
        >
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-1 text-amber-500 font-medium">
              <Star class="size-3.5 fill-amber-500" />
              <span>{{ course.avgRating ? Number(course.avgRating).toFixed(1) : '5.0' }}</span>
            </div>
            <span class="text-muted-foreground text-[11px]">({{ course.totalReviews || 1 }} ulasan)</span>
          </div>

          <Button
            size="sm"
            :variant="course.isExamPassed ? 'secondary' : 'default'"
            class="h-8 gap-1.5 rounded-lg text-xs font-semibold px-3 group-hover:translate-x-0.5 transition-transform"
          >
            <span>{{ course.isExamPassed ? 'Buka Sertifikat' : (course.progressPercent || 0) > 0 ? 'Lanjutkan' : 'Mulai Kursus' }}</span>
            <ArrowRight class="size-3.5" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>
