<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '@/lib/api'
import type { Course } from '@/types'
import { findLanguageInfo } from '@/lib/tts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import {
  GraduationCap,
  Star,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  FileText,
  Sparkles
} from '@lucide/vue'

const emit = defineEmits<{
  (e: 'open-auth'): void
}>()

const isLoading = ref(false)
const rawCourses = ref<Course[]>([])
const selectedFilter = ref<string>('all')

const fallbackCourses: Partial<Course>[] = [
  {
    id: 'course-sample-de-a1',
    title: 'Tata Bahasa Jerman A1: Artikel & Kata Benda',
    description: 'Pelajari konsep gender der/die/das, bentuk jamak, dan kalimat dasar Jerman A1 lengkap dengan bank soal.',
    level: 'A1',
    category: 'Tata Bahasa',
    targetLanguage: 'de-DE',
    questionCount: 15,
    hasMarkdown: true,
    avgRating: 4.9,
    totalReviews: 24,
    author: { id: 'auth-1', name: 'Tim Kurikulum Lingua', isOfficial: true }
  },
  {
    id: 'course-sample-es-a1',
    title: 'Percakapan & Tata Bahasa Spanyol Pemula',
    description: 'Kuasai konjugasi kata kerja ser vs estar, salam harian, dan penyusunan kalimat bahasa Spanyol.',
    level: 'A1',
    category: 'Percakapan',
    targetLanguage: 'es-ES',
    questionCount: 18,
    hasMarkdown: true,
    avgRating: 4.8,
    totalReviews: 19,
    author: { id: 'auth-2', name: 'Tim Kurikulum Lingua', isOfficial: true }
  },
  {
    id: 'course-sample-fr-a2',
    title: 'Bahasa Prancis A2: Passé Composé & Partitif',
    description: 'Pendalaman bentuk lampau Prancis, artikel partitif, dan kosakata sehari-hari dengan pelafalan asli.',
    level: 'A2',
    category: 'Tata Bahasa',
    targetLanguage: 'fr-FR',
    questionCount: 20,
    hasMarkdown: true,
    avgRating: 5.0,
    totalReviews: 14,
    author: { id: 'auth-3', name: 'Tim Kurikulum Lingua', isOfficial: true }
  }
]

async function loadCourses() {
  isLoading.value = true
  try {
    const list = await api.courses.getAll({ tab: 'all' })
    if (Array.isArray(list) && list.length > 0) {
      rawCourses.value = list
    } else {
      rawCourses.value = fallbackCourses as Course[]
    }
  } catch (err) {
    console.warn('Using fallback courses for landing preview:', err)
    rawCourses.value = fallbackCourses as Course[]
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadCourses()
})

const filteredCourses = computed(() => {
  let list = rawCourses.value
  if (selectedFilter.value !== 'all') {
    list = list.filter(c => c.targetLanguage?.startsWith(selectedFilter.value))
  }
  return list.slice(0, 6)
})

function getAuthorInitial(name?: string): string {
  if (!name) return 'L'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
</script>

<template>
  <section id="katalog" class="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <!-- Section Title & Subtitle -->
    <div class="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
      <Badge variant="outline" class="mb-3 px-3.5 py-1 font-semibold border-primary/30 text-primary bg-primary/5">
        <GraduationCap class="size-3.5 mr-1 text-primary" />
        Katalog Kursus Terpadu
      </Badge>
      <h2 class="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
        Jelajahi Kursus Unggulan Bersertifikat
      </h2>
      <p class="mt-4 text-muted-foreground text-sm sm:text-base leading-relaxed">
        Setiap kursus menyatukan modul bacaan teori Markdown dengan latihan kuis interaktif, leaderboard, dan sertifikat kelulusan resmi.
      </p>

      <!-- Language Filter Tabs -->
      <div class="mt-8 flex flex-wrap items-center justify-center gap-2">
        <button
          @click="selectedFilter = 'all'"
          :class="[
            'px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border',
            selectedFilter === 'all'
              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
              : 'bg-muted/60 text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted'
          ]"
        >
          Semua Bahasa
        </button>
        <button
          @click="selectedFilter = 'de'"
          :class="[
            'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5',
            selectedFilter === 'de'
              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
              : 'bg-muted/60 text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted'
          ]"
        >
          <span>🇩🇪</span>
          <span>Jerman</span>
        </button>
        <button
          @click="selectedFilter = 'es'"
          :class="[
            'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5',
            selectedFilter === 'es'
              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
              : 'bg-muted/60 text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted'
          ]"
        >
          <span>🇪🇸</span>
          <span>Spanyol</span>
        </button>
        <button
          @click="selectedFilter = 'fr'"
          :class="[
            'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5',
            selectedFilter === 'fr'
              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
              : 'bg-muted/60 text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted'
          ]"
        >
          <span>🇫🇷</span>
          <span>Prancis</span>
        </button>
        <button
          @click="selectedFilter = 'ja'"
          :class="[
            'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5',
            selectedFilter === 'ja'
              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
              : 'bg-muted/60 text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted'
          ]"
        >
          <span>🇯🇵</span>
          <span>Jepang</span>
        </button>
      </div>
    </div>

    <!-- Courses Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card
        v-for="course in filteredCourses"
        :key="course.id"
        class="border-border/80 bg-card hover:border-primary/50 transition-all hover:shadow-lg hover:-translate-y-1 flex flex-col justify-between group overflow-hidden"
      >
        <CardContent class="p-6 pb-4 space-y-4">
          <!-- Top Badges Row -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="text-xl leading-none">
                {{ findLanguageInfo(course.targetLanguage || 'de-DE')?.flag || '🌐' }}
              </span>
              <Badge variant="outline" class="font-mono text-[11px] font-bold border-primary/30 text-primary bg-primary/5">
                {{ course.level }}
              </Badge>
              <Badge variant="secondary" class="text-[10px]">
                {{ course.category }}
              </Badge>
            </div>

            <!-- Review Stars Rating -->
            <div class="flex items-center gap-1 text-xs text-amber-500 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              <Star class="size-3 fill-amber-500 text-amber-500" />
              <span>{{ course.avgRating ? course.avgRating.toFixed(1) : '5.0' }}</span>
              <span class="text-[10px] text-muted-foreground">({{ course.totalReviews || 12 }})</span>
            </div>
          </div>

          <!-- Course Title & Description -->
          <div class="space-y-1.5">
            <h3 class="font-bold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
              {{ course.title }}
            </h3>
            <p class="text-xs sm:text-sm text-muted-foreground line-clamp-3 leading-relaxed">
              {{ course.description || 'Pelajari materi tata bahasa lengkap dengan panduan terpadu dan latihan kuis interaktif.' }}
            </p>
          </div>

          <!-- Features Ribbon Chips -->
          <div class="pt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <div class="flex items-center gap-1 bg-muted/60 px-2.5 py-1 rounded-md border border-border/50">
              <FileText class="size-3 text-primary" />
              <span>Modul Teori .md</span>
            </div>
            <div class="flex items-center gap-1 bg-muted/60 px-2.5 py-1 rounded-md border border-border/50">
              <BookOpen class="size-3 text-emerald-500" />
              <span>{{ course.questionCount || 15 }} Soal Kuis</span>
            </div>
          </div>
        </CardContent>

        <!-- Card Footer with Author and Action -->
        <CardFooter class="p-6 pt-0 border-t border-border/50 mt-4 flex items-center justify-between gap-3">
          <!-- Author Info -->
          <div class="flex items-center gap-2 min-w-0">
            <div
              class="size-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border"
              :class="course.author?.isPartner
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                : 'bg-primary/10 text-primary border-primary/20'"
            >
              {{ getAuthorInitial(course.author?.name) }}
            </div>
            <div class="truncate text-xs">
              <div class="font-semibold text-foreground truncate flex items-center gap-1">
                <span>{{ course.author?.name || 'Tim Kurikulum Lingua' }}</span>
                <Badge
                  v-if="course.author?.isPartner"
                  variant="outline"
                  class="text-[9px] px-1 py-0 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-medium shrink-0 flex items-center gap-0.5"
                >
                  <ShieldCheck class="size-2.5 text-blue-600 dark:text-blue-400" />
                  <span>Partner</span>
                </Badge>
                <ShieldCheck
                  v-else-if="course.author?.isOfficial !== false"
                  class="size-3 text-emerald-500 shrink-0"
                  title="Resmi"
                />
              </div>
            </div>
          </div>

          <!-- CTA Button -->
          <Button
            size="sm"
            @click="emit('open-auth')"
            class="gap-1.5 text-xs font-semibold shrink-0 cursor-pointer shadow-xs group-hover:bg-primary"
          >
            <span>Mulai</span>
            <ArrowRight class="size-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </CardFooter>
      </Card>
    </div>

    <!-- Bottom Secondary CTA -->
    <div class="mt-12 text-center">
      <Button
        variant="outline"
        size="lg"
        @click="emit('open-auth')"
        class="gap-2 border-border/80 hover:bg-muted font-medium text-xs sm:text-sm cursor-pointer"
      >
        <Sparkles class="size-4 text-primary" />
        <span>Daftar Gratis untuk Mengakses Seluruh Katalog Kursus</span>
        <ArrowRight class="size-4 text-muted-foreground" />
      </Button>
    </div>
  </section>
</template>
