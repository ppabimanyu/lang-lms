<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { api } from '@/lib/api'
import { adminActiveTab } from '@/lib/storage'
import type { AdminStats, AdminUserItem, AdminCourseItem, AdminQuizActivityItem } from '@/types'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  BookOpen,
  Award,
  Sparkles,
  RefreshCw,
  ArrowRight,
  Activity
} from '@lucide/vue'

const isLoading = ref(false)
const stats = ref<AdminStats | null>(null)
const recentUsers = ref<AdminUserItem[]>([])
const recentCourses = ref<AdminCourseItem[]>([])
const recentActivities = ref<AdminQuizActivityItem[]>([])
const lastUpdatedTime = ref<string>('')

async function loadOverviewData() {
  isLoading.value = true
  try {
    const [statsRes, usersRes, coursesRes, activitiesRes] = await Promise.all([
      api.admin.getStats(),
      api.admin.getUsers(),
      api.admin.getCourses(),
      api.admin.getQuizActivity()
    ])
    stats.value = statsRes
    recentUsers.value = usersRes.slice(0, 5)
    recentCourses.value = coursesRes.slice(0, 5)
    recentActivities.value = activitiesRes.slice(0, 5)
    lastUpdatedTime.value = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch (err: any) {
    console.error('Failed to load admin overview:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadOverviewData()
})

const activeUsersPercent = computed(() => {
  if (!stats.value?.users.total) return 100
  return Math.round((stats.value.users.active / stats.value.users.total) * 100)
})

const publishedCoursesPercent = computed(() => {
  if (!stats.value?.courses.total) return 100
  return Math.round((stats.value.courses.published / stats.value.courses.total) * 100)
})

const passRatePercent = computed(() => {
  if (!stats.value?.quizzes.totalSessions) return 100
  return Math.round((stats.value.quizzes.passedSessions / stats.value.quizzes.totalSessions) * 100)
})

function formatTime(isoStr?: string) {
  if (!isoStr) return '-'
  try {
    return new Date(isoStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return isoStr
  }
}
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
    <!-- Top Action Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          Dashboard Monitoring
          <Badge variant="outline" class="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30 text-[10px] uppercase font-mono">
            Live
          </Badge>
        </h1>
        <p class="text-xs text-muted-foreground mt-0.5">
          Gambaran umum kesehatan ekosistem platform, metrik keterlibatan murid, dan status konten kursus.
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <span v-if="lastUpdatedTime" class="text-[11px] text-muted-foreground font-mono hidden sm:inline">
          Disinkronkan: {{ lastUpdatedTime }} WIB
        </span>
        <Button
          variant="outline"
          size="sm"
          class="gap-1.5 text-xs h-8 bg-card cursor-pointer"
          :disabled="isLoading"
          @click="loadOverviewData"
        >
          <RefreshCw class="size-3.5" :class="{ 'animate-spin': isLoading }" />
          <span>Segarkan</span>
        </Button>
      </div>
    </div>

    <!-- 4 Key Metrics (KPIs) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 1. Total Pengguna -->
      <Card class="border-border/80 bg-card shadow-xs relative overflow-hidden">
        <CardContent class="p-5 flex items-center justify-between">
          <div class="space-y-1">
            <span class="text-xs text-muted-foreground font-medium">Total Pengguna</span>
            <div class="text-3xl font-black text-foreground tracking-tight">
              {{ stats?.users.total || 0 }}
            </div>
            <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5">
              <span class="text-emerald-600 dark:text-emerald-400 font-semibold">{{ stats?.users.active || 0 }} Aktif</span>
              <span>•</span>
              <span class="text-destructive font-semibold">{{ stats?.users.inactive || 0 }} Nonaktif</span>
            </div>
          </div>
          <div class="size-11 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Users class="size-5" />
          </div>
        </CardContent>
      </Card>

      <!-- 2. Total Modul Kursus -->
      <Card class="border-border/80 bg-card shadow-xs relative overflow-hidden">
        <CardContent class="p-5 flex items-center justify-between">
          <div class="space-y-1">
            <span class="text-xs text-muted-foreground font-medium">Modul Kursus</span>
            <div class="text-3xl font-black text-foreground tracking-tight">
              {{ stats?.courses.total || 0 }}
            </div>
            <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5">
              <span class="text-emerald-600 dark:text-emerald-400 font-semibold">{{ stats?.courses.published || 0 }} Tayang</span>
              <span>•</span>
              <span class="text-amber-600 dark:text-amber-400 font-semibold">{{ stats?.courses.takedown || 0 }} Takedown</span>
            </div>
          </div>
          <div class="size-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <BookOpen class="size-5" />
          </div>
        </CardContent>
      </Card>

      <!-- 3. Sesi Kuis Selesai -->
      <Card class="border-border/80 bg-card shadow-xs relative overflow-hidden">
        <CardContent class="p-5 flex items-center justify-between">
          <div class="space-y-1">
            <span class="text-xs text-muted-foreground font-medium">Sesi Kuis Dikerjakan</span>
            <div class="text-3xl font-black text-foreground tracking-tight">
              {{ stats?.quizzes.totalSessions || 0 }}
            </div>
            <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5">
              <span class="text-emerald-600 dark:text-emerald-400 font-semibold">{{ stats?.quizzes.passedSessions || 0 }} Lulus</span>
              <span>({{ passRatePercent }}%)</span>
            </div>
          </div>
          <div class="size-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Award class="size-5" />
          </div>
        </CardContent>
      </Card>

      <!-- 4. Total XP Ekosistem -->
      <Card class="border-border/80 bg-card shadow-xs relative overflow-hidden">
        <CardContent class="p-5 flex items-center justify-between">
          <div class="space-y-1">
            <span class="text-xs text-muted-foreground font-medium">Total XP Diberikan</span>
            <div class="text-3xl font-black text-foreground tracking-tight">
              {{ (stats?.quizzes.totalXpAwarded || 0).toLocaleString('id-ID') }}
            </div>
            <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5">
              <span class="text-muted-foreground font-semibold">Ulasan: {{ stats?.reviews.totalReviews || 0 }} (★ {{ stats?.reviews.avgRating || 5.0 }})</span>
            </div>
          </div>
          <div class="size-11 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
            <Sparkles class="size-5" />
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Health Breakdown & Distribution Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Status Distribusi Pengguna -->
      <Card class="border-border/80 bg-card shadow-xs">
        <CardHeader class="pb-3">
          <div class="flex items-center justify-between">
            <CardTitle class="text-sm font-semibold flex items-center gap-2">
              <Users class="size-4 text-indigo-600 dark:text-indigo-400" />
              <span>Distribusi Status Pengguna</span>
            </CardTitle>
            <Badge variant="outline" class="text-[11px] font-mono">
              {{ activeUsersPercent }}% Aktif
            </Badge>
          </div>
          <CardDescription class="text-xs">
            Perbandingan akun pengguna aktif yang diizinkan mengakses fitur versus akun yang diblokir/dinonaktifkan.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4 pt-1">
          <!-- Progress bar -->
          <div class="h-2.5 w-full bg-destructive/20 rounded-full overflow-hidden flex">
            <div class="h-full bg-emerald-500 transition-all duration-500" :style="{ width: `${activeUsersPercent}%` }"></div>
          </div>
          <div class="flex items-center justify-between text-xs pt-1">
            <div class="flex items-center gap-2">
              <span class="size-2 rounded-full bg-emerald-500"></span>
              <span class="font-medium">Akun Aktif: {{ stats?.users.active || 0 }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="size-2 rounded-full bg-destructive"></span>
              <span class="font-medium text-destructive">Akun Nonaktif: {{ stats?.users.inactive || 0 }}</span>
            </div>
          </div>
          <div class="pt-2 border-t border-border/60 flex items-center justify-between">
            <span class="text-xs text-muted-foreground">Kelola hak akses dan status aktivasi</span>
            <Button variant="ghost" size="sm" class="h-7 text-xs gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 cursor-pointer" @click="adminActiveTab = 'users'">
              <span>Buka Menu User</span>
              <ArrowRight class="size-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <!-- Status Distribusi Kursus -->
      <Card class="border-border/80 bg-card shadow-xs">
        <CardHeader class="pb-3">
          <div class="flex items-center justify-between">
            <CardTitle class="text-sm font-semibold flex items-center gap-2">
              <BookOpen class="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>Distribusi Moderasi Kursus</span>
            </CardTitle>
            <Badge variant="outline" class="text-[11px] font-mono">
              {{ publishedCoursesPercent }}% Tayang
            </Badge>
          </div>
          <CardDescription class="text-xs">
            Status modul materi yang tayang di katalog publik versus materi yang di-takedown.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4 pt-1">
          <!-- Progress bar -->
          <div class="h-2.5 w-full bg-amber-500/20 rounded-full overflow-hidden flex">
            <div class="h-full bg-emerald-500 transition-all duration-500" :style="{ width: `${publishedCoursesPercent}%` }"></div>
          </div>
          <div class="flex items-center justify-between text-xs pt-1">
            <div class="flex items-center gap-2">
              <span class="size-2 rounded-full bg-emerald-500"></span>
              <span class="font-medium">Kursus Tayang: {{ stats?.courses.published || 0 }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="size-2 rounded-full bg-amber-500"></span>
              <span class="font-medium text-amber-600 dark:text-amber-400">Di-takedown: {{ stats?.courses.takedown || 0 }}</span>
            </div>
          </div>
          <div class="pt-2 border-t border-border/60 flex items-center justify-between">
            <span class="text-xs text-muted-foreground">Audit konten materi dan bank soal</span>
            <Button variant="ghost" size="sm" class="h-7 text-xs gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 cursor-pointer" @click="adminActiveTab = 'courses'">
              <span>Buka Menu Courses</span>
              <ArrowRight class="size-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Quick Navigation Banner Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div
        @click="adminActiveTab = 'users'"
        class="p-4 rounded-xl bg-card border border-border/80 hover:border-indigo-500/50 hover:shadow-sm cursor-pointer transition-all group flex items-center justify-between"
      >
        <div class="flex items-center gap-3">
          <div class="size-10 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Users class="size-5" />
          </div>
          <div>
            <h4 class="text-xs font-semibold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Manajemen Pengguna</h4>
            <p class="text-[11px] text-muted-foreground">Aktifkan/nonaktifkan akun & role</p>
          </div>
        </div>
        <ArrowRight class="size-4 text-muted-foreground group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
      </div>

      <div
        @click="adminActiveTab = 'courses'"
        class="p-4 rounded-xl bg-card border border-border/80 hover:border-indigo-500/50 hover:shadow-sm cursor-pointer transition-all group flex items-center justify-between"
      >
        <div class="flex items-center gap-3">
          <div class="size-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <BookOpen class="size-5" />
          </div>
          <div>
            <h4 class="text-xs font-semibold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Moderasi Kursus</h4>
            <p class="text-[11px] text-muted-foreground">Audit materi, takedown & pemulihan</p>
          </div>
        </div>
        <ArrowRight class="size-4 text-muted-foreground group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
      </div>

      <div
        @click="adminActiveTab = 'activity'"
        class="p-4 rounded-xl bg-card border border-border/80 hover:border-indigo-500/50 hover:shadow-sm cursor-pointer transition-all group flex items-center justify-between"
      >
        <div class="flex items-center gap-3">
          <div class="size-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Activity class="size-5" />
          </div>
          <div>
            <h4 class="text-xs font-semibold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Log Aktivitas Kuis</h4>
            <p class="text-[11px] text-muted-foreground">Pantau skor kuis & perolehan XP</p>
          </div>
        </div>
        <ArrowRight class="size-4 text-muted-foreground group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>

    <!-- Dual Snapshot Section: Recent Quiz Activities & Recent Courses -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 5 Aktivitas Kuis Terbaru -->
      <Card class="border-border/80 bg-card shadow-xs">
        <CardHeader class="pb-3 border-b border-border/60">
          <div class="flex items-center justify-between">
            <CardTitle class="text-sm font-semibold flex items-center gap-2">
              <Activity class="size-4 text-indigo-600 dark:text-indigo-400" />
              <span>Aktivitas Kuis Terbaru</span>
            </CardTitle>
            <Button variant="ghost" size="sm" class="h-7 text-xs gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 cursor-pointer" @click="adminActiveTab = 'activity'">
              <span>Lihat Semua</span>
              <ArrowRight class="size-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent class="p-0">
          <div v-if="recentActivities.length === 0" class="p-6 text-center text-xs text-muted-foreground">
            Belum ada aktivitas kuis yang tercatat.
          </div>
          <div v-else class="divide-y divide-border/60">
            <div
              v-for="act in recentActivities"
              :key="act.id"
              class="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors text-xs"
            >
              <div class="space-y-0.5 min-w-0 pr-3">
                <div class="font-semibold text-foreground truncate">{{ act.userName }}</div>
                <div class="text-[11px] text-muted-foreground truncate">{{ act.quizTitle }}</div>
              </div>
              <div class="flex items-center gap-2.5 shrink-0">
                <Badge
                  :variant="act.accuracy >= 80 ? 'default' : 'secondary'"
                  class="font-mono text-[10px]"
                  :class="act.accuracy >= 80 ? 'bg-emerald-600 text-white' : 'text-muted-foreground'"
                >
                  {{ act.accuracy }}%
                </Badge>
                <span class="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">+{{ act.xpEarned }} XP</span>
                <span class="text-[10px] text-muted-foreground font-mono">{{ formatTime(act.completedAt) }}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- 5 Kursus Terkini -->
      <Card class="border-border/80 bg-card shadow-xs">
        <CardHeader class="pb-3 border-b border-border/60">
          <div class="flex items-center justify-between">
            <CardTitle class="text-sm font-semibold flex items-center gap-2">
              <BookOpen class="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>Daftar Kursus Terbaru</span>
            </CardTitle>
            <Button variant="ghost" size="sm" class="h-7 text-xs gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 cursor-pointer" @click="adminActiveTab = 'courses'">
              <span>Lihat Semua</span>
              <ArrowRight class="size-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent class="p-0">
          <div v-if="recentCourses.length === 0" class="p-6 text-center text-xs text-muted-foreground">
            Belum ada kursus yang terdaftar.
          </div>
          <div v-else class="divide-y divide-border/60">
            <div
              v-for="c in recentCourses"
              :key="c.id"
              class="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors text-xs"
            >
              <div class="space-y-0.5 min-w-0 pr-3">
                <div class="font-semibold text-foreground truncate flex items-center gap-1.5">
                  <span>{{ c.title }}</span>
                  <Badge variant="outline" class="text-[9px] uppercase px-1 py-0">
                    {{ c.level }}
                  </Badge>
                </div>
                <div class="text-[11px] text-muted-foreground truncate">
                  Oleh: {{ c.author?.name || 'Komunitas' }} • {{ c.questionCount }} Soal
                </div>
              </div>
              <div class="shrink-0">
                <Badge
                  :variant="c.status === 'takedown' ? 'destructive' : 'outline'"
                  class="text-[10px]"
                  :class="c.status !== 'takedown' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' : ''"
                >
                  {{ c.status === 'takedown' ? 'Takedown' : 'Tayang' }}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
