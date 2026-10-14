<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  activeAuthorProfile,
  isAuthorLoading,
  activeTab,
  openCourse
} from '@/lib/storage'
import { findLanguageInfo } from '@/lib/tts'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  User,
  ShieldCheck,
  Calendar,
  BookOpen,
  Trophy,
  Flame,
  Star,
  Search,
  Sparkles,
  Globe,
  Loader2,
  GraduationCap
} from '@lucide/vue'

const searchQuery = ref('')
const selectedLevel = ref('ALL')

const filteredCourses = computed(() => {
  if (!activeAuthorProfile.value?.publicCourses) return []
  let list = activeAuthorProfile.value.publicCourses

  if (selectedLevel.value !== 'ALL') {
    list = list.filter(c => c.level === selectedLevel.value)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(c =>
      c.title.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q)) ||
      c.category.toLowerCase().includes(q)
    )
  }

  return list
})

function getInitials(name: string): string {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Baru Bergabung'
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch {
    return dateStr
  }
}
</script>

<template>
  <div class="space-y-7 max-w-6xl mx-auto pb-16 font-sans">
    <!-- Top Back Navigation -->
    <div class="flex items-center justify-between">
      <Button
        variant="ghost"
        size="sm"
        @click="activeTab = 'courses'"
        class="gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 pl-1"
      >
        <ArrowLeft class="size-4" />
        <span>Kembali ke Katalog Kursus</span>
      </Button>
    </div>

    <!-- Loading State -->
    <div v-if="isAuthorLoading" class="py-24 flex flex-col items-center justify-center gap-3">
      <Loader2 class="size-8 text-primary animate-spin" />
      <p class="text-sm text-muted-foreground font-medium">Memuat profil publik pengguna...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="!activeAuthorProfile" class="py-20 text-center space-y-3">
      <div class="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
        <User class="size-6" />
      </div>
      <h3 class="text-lg font-bold text-foreground">Pengguna Tidak Ditemukan</h3>
      <p class="text-xs text-muted-foreground max-w-sm mx-auto">
        Profil publik yang Anda cari tidak tersedia atau belum mempublikasikan kursus.
      </p>
      <Button size="sm" @click="activeTab = 'courses'" class="mt-2">
        Jelajahi Katalog Kursus
      </Button>
    </div>

    <!-- Loaded Profile View -->
    <template v-else>
      <!-- Author Hero Profile Banner -->
      <Card class="border-border/70 bg-gradient-to-br from-card via-card to-primary/[0.03] shadow-sm overflow-hidden relative">
        <div class="absolute -right-16 -top-16 size-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

        <CardContent class="p-6 sm:p-8">
          <div class="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            <!-- Author Initial Avatar -->
            <div
              class="size-20 sm:size-24 rounded-2xl flex items-center justify-center text-white font-serif font-black text-2xl sm:text-3xl shadow-lg ring-4 ring-background shrink-0 select-none"
              :class="activeAuthorProfile.isOfficial
                ? 'bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 shadow-emerald-500/25'
                : activeAuthorProfile.isPartner
                ? 'bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 shadow-blue-500/25'
                : 'bg-gradient-to-br from-primary via-emerald-600 to-teal-700 shadow-primary/20'"
            >
              <GraduationCap v-if="activeAuthorProfile.isOfficial" class="size-11 text-white" />
              <ShieldCheck v-else-if="activeAuthorProfile.isPartner" class="size-11 text-white" />
              <span v-else>{{ getInitials(activeAuthorProfile.name) }}</span>
            </div>

            <!-- Profile Info -->
            <div class="space-y-2 flex-1">
              <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 class="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  {{ activeAuthorProfile.name }}
                </h1>
                <!-- Verified Partner Badge -->
                <Badge
                  v-if="activeAuthorProfile.isPartner"
                  variant="outline"
                  class="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 gap-1.5 text-xs py-0.5 px-3 font-semibold shadow-2xs"
                >
                  <ShieldCheck class="size-3.5 text-blue-500" />
                  <span>Verified Partner</span>
                </Badge>
                <!-- Verified Badge if official -->
                <Badge
                  v-else-if="activeAuthorProfile.isOfficial"
                  variant="outline"
                  class="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 text-xs py-0.5 px-2.5 font-semibold"
                >
                  <ShieldCheck class="size-3.5" />
                  <span>Resmi Lingua LMS</span>
                </Badge>
                <Badge
                  v-else
                  variant="outline"
                  class="bg-primary/10 text-primary border-primary/20 text-xs py-0.5 px-2.5"
                >
                  Kontributor Komunitas
                </Badge>
              </div>

              <p class="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
                {{ activeAuthorProfile.headline || (activeAuthorProfile.isOfficial ? 'Penyusun Resmi Kurikulum & Konten Pembelajaran Bahasa Lingua LMS.' : 'Pendidik dan pembelajar bahasa aktif yang berkontribusi membuat materi dan soal interaktif.') }}
              </p>

              <!-- Join Date Meta -->
              <div class="flex items-center justify-center sm:justify-start gap-2 pt-1 text-xs text-muted-foreground">
                <Calendar class="size-3.5 text-primary" />
                <span>Bergabung sejak {{ formatDate(activeAuthorProfile.createdAt) }}</span>
              </div>
            </div>
          </div>

          <!-- Public Statistics Cards -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border/60">
            <!-- Total Public Courses -->
            <div class="p-3.5 rounded-xl bg-muted/40 border border-border/50 flex items-center gap-3">
              <div class="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <BookOpen class="size-4.5" />
              </div>
              <div class="min-w-0">
                <div class="text-base sm:text-lg font-extrabold text-foreground font-mono leading-none">
                  {{ activeAuthorProfile.stats?.totalPublicCourses || activeAuthorProfile.publicCourses.length }}
                </div>
                <div class="text-[11px] text-muted-foreground font-medium truncate pt-1">
                  Kursus Publik
                </div>
              </div>
            </div>

            <!-- Total XP -->
            <div class="p-3.5 rounded-xl bg-muted/40 border border-border/50 flex items-center gap-3">
              <div class="size-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Trophy class="size-4.5" />
              </div>
              <div class="min-w-0">
                <div class="text-base sm:text-lg font-extrabold text-foreground font-mono leading-none">
                  {{ (activeAuthorProfile.stats?.xp || 0).toLocaleString('id-ID') }}
                </div>
                <div class="text-[11px] text-muted-foreground font-medium truncate pt-1">
                  Total XP
                </div>
              </div>
            </div>

            <!-- Streak -->
            <div class="p-3.5 rounded-xl bg-muted/40 border border-border/50 flex items-center gap-3">
              <div class="size-9 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Flame class="size-4.5" />
              </div>
              <div class="min-w-0">
                <div class="text-base sm:text-lg font-extrabold text-foreground font-mono leading-none">
                  {{ activeAuthorProfile.stats?.streak || 1 }} Hari
                </div>
                <div class="text-[11px] text-muted-foreground font-medium truncate pt-1">
                  Streak Belajar
                </div>
              </div>
            </div>

            <!-- Quizzes Taken -->
            <div class="p-3.5 rounded-xl bg-muted/40 border border-border/50 flex items-center gap-3">
              <div class="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Sparkles class="size-4.5" />
              </div>
              <div class="min-w-0">
                <div class="text-base sm:text-lg font-extrabold text-foreground font-mono leading-none">
                  {{ activeAuthorProfile.stats?.quizzesTaken || 0 }}
                </div>
                <div class="text-[11px] text-muted-foreground font-medium truncate pt-1">
                  Kuis Selesai
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Public Course Catalog Section -->
      <div class="space-y-4 pt-2">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <span>Katalog Kursus Publik</span>
              <Badge variant="outline" class="font-mono text-xs">
                {{ filteredCourses.length }} Kursus
              </Badge>
            </h2>
            <p class="text-xs text-muted-foreground">
              Daftar seluruh modul pembelajaran publik yang disusun oleh {{ activeAuthorProfile.name }}.
            </p>
          </div>

          <!-- Search & Filter Controls -->
          <div class="flex items-center gap-2">
            <div class="relative w-48 sm:w-60">
              <Search class="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                v-model="searchQuery"
                placeholder="Cari kursus..."
                class="pl-8 text-xs h-9 bg-card"
              />
            </div>
          </div>
        </div>

        <!-- Empty Courses State -->
        <div
          v-if="filteredCourses.length === 0"
          class="p-12 text-center rounded-xl border border-dashed border-border/80 bg-muted/20 space-y-2"
        >
          <BookOpen class="size-8 text-muted-foreground mx-auto" />
          <p class="text-sm font-semibold text-foreground">Tidak Ada Kursus yang Ditemukan</p>
          <p class="text-xs text-muted-foreground">
            {{ searchQuery ? 'Tidak ada kursus yang cocok dengan pencarian Anda.' : 'Pengguna ini belum mempublikasikan kursus publik.' }}
          </p>
        </div>

        <!-- Course Grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card
            v-for="course in filteredCourses"
            :key="course.id"
            class="flex flex-col justify-between border-border/70 hover:border-primary/40 hover:shadow-md transition-all group bg-card"
          >
            <CardHeader class="p-4 sm:p-5 pb-3 space-y-2">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline" class="font-mono text-[11px] font-bold bg-muted/60">
                    {{ findLanguageInfo(course.targetLanguage).flag }} {{ course.level }}
                  </Badge>
                  <Badge variant="secondary" class="text-[10px] font-medium">
                    {{ course.category }}
                  </Badge>
                </div>
                <Badge variant="outline" class="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                  <Globe class="size-2.5 mr-1" />
                  Publik
                </Badge>
              </div>

              <CardTitle class="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {{ course.title }}
              </CardTitle>

              <CardDescription class="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {{ course.description || 'Pelajari materi tata bahasa dan evaluasi interaktif.' }}
              </CardDescription>
            </CardHeader>

            <CardContent class="p-4 sm:p-5 pt-0 space-y-3">
              <!-- Meta Stats: Rating & Question Count -->
              <div class="flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-3">
                <div class="flex items-center gap-1">
                  <Star class="size-3.5 fill-amber-500 text-amber-500" />
                  <span class="font-semibold text-foreground">{{ course.avgRating || 5.0 }}</span>
                  <span class="text-[10px] text-muted-foreground">({{ course.totalReviews || 0 }})</span>
                </div>
                <div class="flex items-center gap-1.5 text-[11px]">
                  <span>{{ course.totalChapters || 0 }} Bab</span>
                  <span>•</span>
                  <span>{{ course.examQuestionsCount || 0 }} Soal Ujian ({{ course.examDurationMinutes || 15 }}m)</span>
                </div>
              </div>

              <!-- Action Button -->
              <Button
                size="sm"
                @click="openCourse(course.id)"
                class="w-full gap-1.5 text-xs font-semibold h-8.5 bg-primary/90 hover:bg-primary"
              >
                <BookOpen class="size-3.5" />
                <span>Pelajari Kursus</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </template>
  </div>
</template>
