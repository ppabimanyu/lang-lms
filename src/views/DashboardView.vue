<script setup lang="ts">
import { computed } from 'vue'
import { courses, myCourses, stats, activeTab, openCourse, openUserProfile, currentUser } from '@/lib/storage'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { findLanguageInfo } from '@/lib/tts'
import {
  Flame,
  Trophy,
  CheckCircle2,
  Target,
  GraduationCap,
  Sparkles,
  ArrowRight,
  FolderGit2,
  Sparkle,
  BookOpen,
  Timer,
  Star,
  ShieldCheck
} from '@lucide/vue'

function getAuthorInitial(name?: string): string {
  if (!name) return 'L'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const accuracyRate = computed(() => {
  if (stats.questionsAnswered === 0) return 0
  return Math.round((stats.correctAnswers / stats.questionsAnswered) * 100)
})

// Courses currently in progress (active learning tracks, not yet passed)
const inProgressCourses = computed(() => {
  return courses.value.filter(c => (c.progressPercent || 0) > 0 && !c.isExamPassed)
})
</script>

<template>
  <div class="space-y-8 max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
    <!-- Welcome Banner Hero -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/20 p-8 shadow-sm">
      <div class="relative z-10 max-w-2xl space-y-3">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold tracking-wide">
          <Sparkle class="size-3.5" />
          <span>Lingua LMS • Kursus Terpadu</span>
        </div>
        <h1 class="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Willkommen! Siap Latihan Hari Ini?
        </h1>
        <p class="text-muted-foreground text-sm sm:text-base leading-relaxed">
          Tingkatkan penguasaan bahasa Anda melalui unit kursus terpadu: teori bacaan Markdown, evaluasi kuis interaktif, dan pelacakan kelulusan bersertifikat.
        </p>

        <div class="pt-2 flex flex-wrap gap-3">
          <Button
            size="lg"
            class="gap-2 shadow-sm font-semibold"
            @click="activeTab = 'courses'"
          >
            <GraduationCap class="size-4" />
            <span>Jelajahi Katalog Kursus</span>
            <ArrowRight class="size-4" />
          </Button>

          <Button
            variant="outline"
            size="lg"
            class="gap-2 font-medium border-border/80"
            @click="activeTab = 'my-courses'"
          >
            <FolderGit2 class="size-4 text-primary" />
            <span>Kelola Kursus Saya ({{ myCourses.length }})</span>
          </Button>
        </div>
      </div>

      <!-- Subtle background graphic accent -->
      <div class="absolute -right-8 -bottom-12 opacity-10 pointer-events-none select-none">
        <Sparkles class="w-64 h-64 text-primary" />
      </div>
    </div>

    <!-- Quick Stats Metric Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card class="bg-card/70 backdrop-blur-xs border-border/80 hover:border-primary/40 transition-colors">
        <CardContent class="p-5 flex items-center gap-4">
          <div class="size-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Flame class="size-6" />
          </div>
          <div>
            <div class="text-2xl font-bold tracking-tight text-foreground">{{ stats.streak }} Hari</div>
            <div class="text-xs text-muted-foreground">Streak Aktif</div>
          </div>
        </CardContent>
      </Card>

      <Card class="bg-card/70 backdrop-blur-xs border-border/80 hover:border-primary/40 transition-colors">
        <CardContent class="p-5 flex items-center gap-4">
          <div class="size-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Trophy class="size-6" />
          </div>
          <div>
            <div class="text-2xl font-bold tracking-tight text-foreground">{{ stats.xp }} XP</div>
            <div class="text-xs text-muted-foreground">Total Poin Belajar</div>
          </div>
        </CardContent>
      </Card>

      <Card class="bg-card/70 backdrop-blur-xs border-border/80 hover:border-primary/40 transition-colors">
        <CardContent class="p-5 flex items-center gap-4">
          <div class="size-12 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <CheckCircle2 class="size-6" />
          </div>
          <div>
            <div class="text-2xl font-bold tracking-tight text-foreground">{{ stats.quizzesTaken }} Sesi</div>
            <div class="text-xs text-muted-foreground">Latihan Tuntas</div>
          </div>
        </CardContent>
      </Card>

      <Card class="bg-card/70 backdrop-blur-xs border-border/80 hover:border-primary/40 transition-colors">
        <CardContent class="p-5 flex items-center gap-4">
          <div class="size-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Target class="size-6" />
          </div>
          <div>
            <div class="text-2xl font-bold tracking-tight text-foreground">{{ accuracyRate }}%</div>
            <div class="text-xs text-muted-foreground">Akurasi Jawaban</div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Seksi 1: Kursus yang Sedang Dipelajari (jika ada progres) -->
    <div v-if="inProgressCourses.length > 0" class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold tracking-tight text-foreground">Lanjutkan Belajar</h2>
          <p class="text-xs text-muted-foreground">Kursus yang sedang Anda pelajari dengan capaian progres</p>
        </div>
        <Button variant="ghost" size="sm" class="gap-1 text-xs" @click="activeTab = 'courses'">
          <span>Katalog Lengkap</span>
          <ArrowRight class="size-3.5" />
        </Button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card
          v-for="course in inProgressCourses.slice(0, 3)"
          :key="course.id"
          class="group flex flex-col justify-between hover:shadow-md hover:border-primary/50 transition-all cursor-pointer bg-card/80"
          @click="openCourse(course.id)"
        >
          <CardHeader class="pb-3 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <Badge variant="outline" class="font-mono text-[10px] tracking-wide border-primary/30 text-primary">
                {{ course.level }} • {{ course.category }}
              </Badge>
              <span class="text-xs" :title="findLanguageInfo(course.targetLanguage).name">
                {{ findLanguageInfo(course.targetLanguage).flag }}
              </span>
            </div>
            <CardTitle class="text-base group-hover:text-primary transition-colors line-clamp-1">
              {{ course.title }}
            </CardTitle>
            <CardDescription class="text-xs line-clamp-2 leading-relaxed">
              {{ course.description || 'Kursus pembelajaran terstruktur.' }}
            </CardDescription>
          </CardHeader>

          <CardFooter class="pt-0 flex flex-col gap-2.5 border-t border-border/50 py-3 text-xs">
            <div class="w-full flex items-center justify-between text-[11px] text-muted-foreground">
              <!-- Author link -->
              <button
                type="button"
                @click.stop="openUserProfile(course.author?.id || 'official')"
                class="flex items-center gap-1.5 hover:text-foreground transition-colors group/author cursor-pointer text-left"
                :title="'Lihat Profil ' + (course.author?.name || 'Tim Kurikulum Lingua')"
              >
                <div
                  class="size-4.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                  :class="course.author?.isOfficial
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                    : course.author?.isPartner
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600'
                    : 'bg-gradient-to-br from-primary to-emerald-600'"
                >
                  {{ getAuthorInitial(course.author?.name) }}
                </div>
                <span class="group-hover/author:text-primary group-hover/author:underline truncate max-w-[110px]">
                  {{ course.author?.name || 'Tim Kurikulum' }}
                </span>
                <Badge
                  v-if="course.author?.isPartner"
                  variant="outline"
                  class="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 gap-0.5 text-[8px] px-1 py-0 font-semibold"
                >
                  <ShieldCheck class="size-2 text-blue-500" />
                  <span>Partner</span>
                </Badge>
                <ShieldCheck v-else-if="course.author?.isOfficial" class="size-3 text-emerald-600 shrink-0" />
              </button>

              <div class="flex items-center gap-1 font-mono">
                <strong class="text-primary">{{ course.progressPercent }}% Selesai</strong>
              </div>
            </div>
            <Progress :model-value="course.progressPercent" class="w-full h-1.5" />
          </CardFooter>
        </Card>
      </div>
    </div>

    <!-- Seksi 2: Katalog Kursus Pilihan -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold tracking-tight text-foreground">Katalog Kursus Pilihan</h2>
          <p class="text-xs text-muted-foreground">Modul materi terpadu lengkap dengan kuis evaluasi dan sertifikat</p>
        </div>
        <Button variant="ghost" size="sm" class="gap-1 text-xs" @click="activeTab = 'courses'">
          <span>Lihat Semua ({{ courses.length }})</span>
          <ArrowRight class="size-3.5" />
        </Button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card
          v-for="course in courses.slice(0, 3)"
          :key="course.id"
          class="group flex flex-col justify-between hover:shadow-md hover:border-primary/50 transition-all cursor-pointer bg-card/80"
          @click="openCourse(course.id)"
        >
          <CardHeader class="pb-3 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <Badge class="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold">
                {{ course.level }} • {{ course.category }}
              </Badge>
              <div class="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Star class="size-3 text-amber-400 fill-amber-400" />
                <span>{{ (course.avgRating || 5.0).toFixed(1) }}</span>
              </div>
            </div>
            <CardTitle class="text-base group-hover:text-primary transition-colors line-clamp-1">
              {{ course.title }}
            </CardTitle>
            <CardDescription class="text-xs line-clamp-2 leading-relaxed">
              {{ course.description || 'Kuasai materi dan latihan soal interaktif.' }}
            </CardDescription>
          </CardHeader>

          <CardFooter class="pt-0 flex flex-col gap-2 border-t border-border/50 py-3 text-xs text-muted-foreground">
            <!-- Author row -->
            <div class="w-full flex items-center justify-between">
              <button
                type="button"
                @click.stop="openUserProfile(course.author?.id || 'official')"
                class="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors group/author cursor-pointer text-left"
                :title="'Lihat Profil ' + (course.author?.name || 'Tim Kurikulum Lingua')"
              >
                <div
                  class="size-4.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                  :class="course.author?.isOfficial
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                    : course.author?.isPartner
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600'
                    : 'bg-gradient-to-br from-primary to-emerald-600'"
                >
                  {{ getAuthorInitial(course.author?.name) }}
                </div>
                <span class="text-[11px] group-hover/author:text-primary group-hover/author:underline truncate max-w-[110px]">
                  {{ course.author?.name || 'Tim Kurikulum Lingua' }}
                </span>
                <Badge
                  v-if="course.author?.isPartner"
                  variant="outline"
                  class="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 gap-0.5 text-[8px] px-1 py-0 font-semibold"
                >
                  <ShieldCheck class="size-2 text-blue-500" />
                  <span>Partner</span>
                </Badge>
                <ShieldCheck v-else-if="course.author?.isOfficial" class="size-3 text-emerald-600 shrink-0" />
              </button>
            </div>

            <!-- Progress Bar (shown if user is logged in) -->
            <div v-if="currentUser" class="w-full space-y-1.5 pt-1 border-t border-border/40">
              <div class="flex items-center justify-between text-[11px] font-medium">
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
              <Progress
                :model-value="course.isExamPassed ? 100 : course.progressPercent || 0"
                class="h-1.5 rounded-full"
              />
            </div>

            <div class="w-full flex items-center justify-between text-[11px]">
              <div class="flex items-center gap-1.5 text-muted-foreground">
                <BookOpen class="size-3 text-primary" />
                <span>{{ course.totalChapters || 0 }} Bab</span>
                <span>•</span>
                <Timer class="size-3 text-amber-500" />
                <span>{{ course.examDurationMinutes || 15 }}m Ujian</span>
              </div>
              <span class="text-primary font-medium inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                {{ course.isExamPassed ? 'Buka Sertifikat' : (course.progressPercent || 0) > 0 ? 'Lanjutkan' : 'Buka Kursus' }} <ArrowRight class="size-3" />
              </span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>

    <!-- Seksi 3: Riwayat Hasil Belajar Terakhir -->
    <div v-if="stats.recentResults.length > 0" class="space-y-4">
      <h2 class="text-xl font-bold tracking-tight text-foreground">Riwayat Latihan Terakhir</h2>
      <div class="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
        <div
          v-for="(res, idx) in stats.recentResults.slice(0, 5)"
          :key="idx"
          class="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
        >
          <div class="space-y-1">
            <div class="font-medium text-sm text-foreground">{{ res.quizTitle }}</div>
            <div class="text-xs text-muted-foreground flex items-center gap-3">
              <span>{{ new Date(res.completedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) }}</span>
              <span>•</span>
              <span>{{ res.correctCount }}/{{ res.totalQuestions }} Soal Benar</span>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <div class="text-right">
              <div class="text-sm font-bold text-foreground">{{ res.accuracy }}%</div>
              <div class="text-[10px] text-primary font-medium">+{{ res.xpEarned }} XP</div>
            </div>
            <Progress :model-value="res.accuracy" class="w-20 h-2" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
