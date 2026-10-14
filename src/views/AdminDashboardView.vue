<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '@/lib/api'
import { currentUser, openCourse, openUserProfile } from '@/lib/storage'
import type { AdminStats, AdminUserItem, AdminCourseItem, AdminQuizActivityItem } from '@/types'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import {
  ShieldAlert,
  Users,
  BookOpen,
  Sparkles,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  Trash2,
  Activity,
  Award,
  UserX,
  UserCheck,
  Shield,
  ArrowUpRight,
  Clock,
  Lock,
  Globe
} from '@lucide/vue'

const activeAdminTab = ref<'overview' | 'users' | 'courses' | 'activity'>('overview')
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

// Data State
const stats = ref<AdminStats | null>(null)
const usersList = ref<AdminUserItem[]>([])
const coursesList = ref<AdminCourseItem[]>([])
const quizActivities = ref<AdminQuizActivityItem[]>([])

// Filter State
const userSearch = ref('')
const userRoleFilter = ref('ALL')
const userStatusFilter = ref('ALL')

const courseSearch = ref('')
const courseStatusFilter = ref('ALL')
const courseVisibilityFilter = ref('ALL')

// Dialog States
const isTakedownDialogOpen = ref(false)
const selectedCourseForTakedown = ref<AdminCourseItem | null>(null)
const takedownReasonInput = ref('Konten tidak sesuai atau melanggar pedoman kurikulum.')
const isTakedownActionLoading = ref(false)

const isUserStatusDialogOpen = ref(false)
const selectedUserForStatus = ref<AdminUserItem | null>(null)
const targetUserStatus = ref<'active' | 'inactive'>('inactive')
const isUserStatusActionLoading = ref(false)

const isRoleDialogOpen = ref(false)
const selectedUserForRole = ref<AdminUserItem | null>(null)
const targetUserRole = ref<'student' | 'curriculum' | 'admin'>('student')
const isRoleActionLoading = ref(false)

// Fetch Data
async function fetchAdminData() {
  isLoading.value = true
  errorMessage.value = null
  try {
    const [statsRes, usersRes, coursesRes, activitiesRes] = await Promise.all([
      api.admin.getStats(),
      api.admin.getUsers(),
      api.admin.getCourses(),
      api.admin.getQuizActivity()
    ])
    stats.value = statsRes
    usersList.value = usersRes
    coursesList.value = coursesRes
    quizActivities.value = activitiesRes
  } catch (err: any) {
    errorMessage.value = err.message || 'Gagal memuat data admin.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchAdminData()
})

// Filtered Users
const filteredUsers = computed(() => {
  let list = usersList.value
  if (userRoleFilter.value !== 'ALL') {
    list = list.filter(u => u.role === userRoleFilter.value)
  }
  if (userStatusFilter.value !== 'ALL') {
    list = list.filter(u => u.status === userStatusFilter.value)
  }
  if (userSearch.value.trim()) {
    const q = userSearch.value.toLowerCase().trim()
    list = list.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    )
  }
  return list
})

// Filtered Courses
const filteredCourses = computed(() => {
  let list = coursesList.value
  if (courseStatusFilter.value !== 'ALL') {
    list = list.filter(c => c.status === courseStatusFilter.value)
  }
  if (courseVisibilityFilter.value !== 'ALL') {
    list = list.filter(c => c.visibility === courseVisibilityFilter.value)
  }
  if (courseSearch.value.trim()) {
    const q = courseSearch.value.toLowerCase().trim()
    list = list.filter(c =>
      c.title.toLowerCase().includes(q) ||
      (c.author?.name && c.author.name.toLowerCase().includes(q)) ||
      c.category.toLowerCase().includes(q)
    )
  }
  return list
})

// --- ACTIONS: COURSE TAKEDOWN & RESTORE ---
function promptTakedownCourse(course: AdminCourseItem) {
  selectedCourseForTakedown.value = course
  takedownReasonInput.value = course.takedownReason || 'Pelanggaran standar kurikulum atau laporan konten tidak pantas.'
  isTakedownDialogOpen.value = true
}

async function confirmTakedownCourse() {
  if (!selectedCourseForTakedown.value) return
  isTakedownActionLoading.value = true
  try {
    const res = await api.admin.toggleCourseTakedown(
      selectedCourseForTakedown.value.id,
      'takedown',
      takedownReasonInput.value
    )
    successMessage.value = res.message
    isTakedownDialogOpen.value = false
    await fetchAdminData()
    setTimeout(() => { successMessage.value = null }, 4000)
  } catch (err: any) {
    errorMessage.value = err.message || 'Gagal melakukan takedown pada kursus.'
  } finally {
    isTakedownActionLoading.value = false
  }
}

async function restoreCourse(course: AdminCourseItem) {
  isTakedownActionLoading.value = true
  try {
    const res = await api.admin.toggleCourseTakedown(course.id, 'published')
    successMessage.value = res.message
    await fetchAdminData()
    setTimeout(() => { successMessage.value = null }, 4000)
  } catch (err: any) {
    errorMessage.value = err.message || 'Gagal memulihkan kursus.'
  } finally {
    isTakedownActionLoading.value = false
  }
}

async function forceDeleteCourse(course: AdminCourseItem) {
  if (!confirm(`Peringatan: Apakah Anda yakin ingin menghapus permanen kursus "${course.title}"? Seluruh soal dan riwayat kuis terkait akan ikut terhapus.`)) {
    return
  }
  try {
    const res = await api.admin.deleteCourse(course.id)
    successMessage.value = res.message
    await fetchAdminData()
    setTimeout(() => { successMessage.value = null }, 4000)
  } catch (err: any) {
    errorMessage.value = err.message || 'Gagal menghapus kursus.'
  }
}

// --- ACTIONS: USER STATUS & ROLE ---
function promptUserStatusToggle(user: AdminUserItem) {
  selectedUserForStatus.value = user
  targetUserStatus.value = user.status === 'active' ? 'inactive' : 'active'
  isUserStatusDialogOpen.value = true
}

async function confirmUserStatusToggle() {
  if (!selectedUserForStatus.value) return
  isUserStatusActionLoading.value = true
  try {
    const res = await api.admin.updateUserStatus(
      selectedUserForStatus.value.id,
      targetUserStatus.value
    )
    successMessage.value = res.message
    isUserStatusDialogOpen.value = false
    await fetchAdminData()
    setTimeout(() => { successMessage.value = null }, 4000)
  } catch (err: any) {
    errorMessage.value = err.message || 'Gagal mengubah status pengguna.'
  } finally {
    isUserStatusActionLoading.value = false
  }
}

function promptChangeRole(user: AdminUserItem) {
  selectedUserForRole.value = user
  targetUserRole.value = user.role as any
  isRoleDialogOpen.value = true
}

async function confirmUserRoleChange() {
  if (!selectedUserForRole.value) return
  isRoleActionLoading.value = true
  try {
    const res = await api.admin.updateUserRole(
      selectedUserForRole.value.id,
      targetUserRole.value
    )
    successMessage.value = res.message
    isRoleDialogOpen.value = false
    await fetchAdminData()
    setTimeout(() => { successMessage.value = null }, 4000)
  } catch (err: any) {
    errorMessage.value = err.message || 'Gagal mengubah role pengguna.'
  } finally {
    isRoleActionLoading.value = false
  }
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateStr
  }
}
</script>

<template>
  <div class="space-y-7 max-w-7xl mx-auto pb-20 font-sans">
    <!-- Top Hero Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
      <div class="space-y-1">
        <div class="flex items-center gap-2.5">
          <div class="size-8 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <ShieldAlert class="size-5" />
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Panel Administrator
            <Badge variant="outline" class="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30 text-[10px] font-mono uppercase tracking-wider">
              Super Admin
            </Badge>
          </h1>
        </div>
        <p class="text-xs text-muted-foreground max-w-3xl">
          Pusat kendali dan audit platform: pantau metrik performa, kelola status pengguna, kurasi serta lakukan takedown kursus bermasalah secara langsung.
        </p>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          class="gap-1.5 text-xs h-9 bg-card hover:bg-muted"
          :disabled="isLoading"
          @click="fetchAdminData"
        >
          <RefreshCw class="size-3.5" :class="{ 'animate-spin': isLoading }" />
          <span>Segarkan Data</span>
        </Button>
      </div>
    </div>

    <!-- Feedback Alerts -->
    <div v-if="successMessage" class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5 text-xs animate-in fade-in-50">
      <CheckCircle2 class="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <span>{{ successMessage }}</span>
    </div>
    <div v-if="errorMessage" class="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive flex items-center gap-2.5 text-xs animate-in fade-in-50">
      <AlertTriangle class="size-4 shrink-0" />
      <span>{{ errorMessage }}</span>
    </div>

    <!-- Metric Stat Cards (KPIs) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Pengguna -->
      <Card class="border-border/80 bg-card shadow-xs relative overflow-hidden">
        <CardContent class="p-5 flex items-center justify-between">
          <div class="space-y-1">
            <span class="text-xs text-muted-foreground font-medium">Total Pengguna</span>
            <div class="text-2xl font-black text-foreground">
              {{ stats?.users.total || 0 }}
            </div>
            <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5">
              <span class="text-emerald-600 dark:text-emerald-400 font-semibold">{{ stats?.users.active || 0 }} Aktif</span>
              <span>•</span>
              <span class="text-destructive font-semibold">{{ stats?.users.inactive || 0 }} Nonaktif</span>
            </div>
          </div>
          <div class="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Users class="size-5" />
          </div>
        </CardContent>
      </Card>

      <!-- Total Kursus -->
      <Card class="border-border/80 bg-card shadow-xs relative overflow-hidden">
        <CardContent class="p-5 flex items-center justify-between">
          <div class="space-y-1">
            <span class="text-xs text-muted-foreground font-medium">Total Modul Kursus</span>
            <div class="text-2xl font-black text-foreground">
              {{ stats?.courses.total || 0 }}
            </div>
            <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5">
              <span class="text-emerald-600 dark:text-emerald-400 font-semibold">{{ stats?.courses.published || 0 }} Tayang</span>
              <span>•</span>
              <span class="text-amber-600 dark:text-amber-400 font-semibold">{{ stats?.courses.takedown || 0 }} Ditakedown</span>
            </div>
          </div>
          <div class="size-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <BookOpen class="size-5" />
          </div>
        </CardContent>
      </Card>

      <!-- Sesi Kuis Selesai -->
      <Card class="border-border/80 bg-card shadow-xs relative overflow-hidden">
        <CardContent class="p-5 flex items-center justify-between">
          <div class="space-y-1">
            <span class="text-xs text-muted-foreground font-medium">Sesi Kuis Dikerjakan</span>
            <div class="text-2xl font-black text-foreground">
              {{ stats?.quizzes.totalSessions || 0 }}
            </div>
            <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5">
              <span class="text-emerald-600 font-semibold">{{ stats?.quizzes.passedSessions || 0 }} Lulus (>=80%)</span>
            </div>
          </div>
          <div class="size-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Award class="size-5" />
          </div>
        </CardContent>
      </Card>

      <!-- XP & Rating -->
      <Card class="border-border/80 bg-card shadow-xs relative overflow-hidden">
        <CardContent class="p-5 flex items-center justify-between">
          <div class="space-y-1">
            <span class="text-xs text-muted-foreground font-medium">Total XP Diberikan</span>
            <div class="text-2xl font-black text-foreground">
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

    <!-- Main Admin Navigation Tabs -->
    <Tabs v-model="activeAdminTab" class="space-y-6">
      <TabsList class="grid grid-cols-4 w-full sm:max-w-xl bg-muted/60 p-1 rounded-xl border border-border/80">
        <TabsTrigger value="overview" class="text-xs gap-1.5 font-medium data-[state=active]:font-bold">
          <Activity class="size-3.5" />
          <span>Ringkasan</span>
        </TabsTrigger>
        <TabsTrigger value="users" class="text-xs gap-1.5 font-medium data-[state=active]:font-bold">
          <Users class="size-3.5" />
          <span>Pengguna ({{ usersList.length }})</span>
        </TabsTrigger>
        <TabsTrigger value="courses" class="text-xs gap-1.5 font-medium data-[state=active]:font-bold">
          <BookOpen class="size-3.5" />
          <span>Kursus ({{ coursesList.length }})</span>
        </TabsTrigger>
        <TabsTrigger value="activity" class="text-xs gap-1.5 font-medium data-[state=active]:font-bold">
          <Clock class="size-3.5" />
          <span>Aktivitas Kuis</span>
        </TabsTrigger>
      </TabsList>

      <!-- TAB 1: OVERVIEW -->
      <TabsContent value="overview" class="space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Recent Users Card -->
          <Card class="border-border/80 bg-card shadow-2xs">
            <CardHeader class="pb-3 border-b border-border/60">
              <div class="flex items-center justify-between">
                <div>
                  <CardTitle class="text-sm font-bold flex items-center gap-2">
                    <Users class="size-4 text-primary" />
                    <span>Pendaftaran Pengguna Terbaru</span>
                  </CardTitle>
                  <CardDescription class="text-xs">Daftar akun terbaru yang terdaftar di platform</CardDescription>
                </div>
                <Button variant="ghost" size="sm" class="text-xs h-7" @click="activeAdminTab = 'users'">
                  Lihat Semua
                </Button>
              </div>
            </CardHeader>
            <CardContent class="p-0 divide-y divide-border/60">
              <div
                v-for="u in usersList.slice(0, 5)"
                :key="u.id"
                class="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <div class="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {{ u.name.charAt(0).toUpperCase() }}
                  </div>
                  <div class="min-w-0">
                    <div class="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
                      <span>{{ u.name }}</span>
                      <Badge
                        variant="outline"
                        class="text-[9px] px-1 py-0 h-4"
                        :class="u.role === 'admin' ? 'border-indigo-500/40 text-indigo-600 bg-indigo-500/10' : u.role === 'curriculum' ? 'border-emerald-500/40 text-emerald-600 bg-emerald-500/10' : ''"
                      >
                        {{ u.role }}
                      </Badge>
                    </div>
                    <div class="text-[11px] text-muted-foreground truncate">{{ u.email }}</div>
                  </div>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <Badge
                    :variant="u.status === 'active' ? 'default' : 'destructive'"
                    class="text-[10px] py-0 px-2 font-mono uppercase"
                  >
                    {{ u.status === 'active' ? 'Aktif' : 'Nonaktif' }}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <!-- Recent Courses Card -->
          <Card class="border-border/80 bg-card shadow-2xs">
            <CardHeader class="pb-3 border-b border-border/60">
              <div class="flex items-center justify-between">
                <div>
                  <CardTitle class="text-sm font-bold flex items-center gap-2">
                    <BookOpen class="size-4 text-emerald-600" />
                    <span>Kursus & Status Publikasi</span>
                  </CardTitle>
                  <CardDescription class="text-xs">Kursus aktif dan status tayang di sistem</CardDescription>
                </div>
                <Button variant="ghost" size="sm" class="text-xs h-7" @click="activeAdminTab = 'courses'">
                  Kelola Kursus
                </Button>
              </div>
            </CardHeader>
            <CardContent class="p-0 divide-y divide-border/60">
              <div
                v-for="c in coursesList.slice(0, 5)"
                :key="c.id"
                class="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div class="min-w-0 space-y-0.5">
                  <div class="text-xs font-bold text-foreground truncate flex items-center gap-2">
                    <span>{{ c.title }}</span>
                    <Badge variant="outline" class="text-[9px] font-mono py-0 h-4">{{ c.level }}</Badge>
                  </div>
                  <div class="text-[11px] text-muted-foreground truncate flex items-center gap-2">
                    <span>Pembuat: {{ c.author?.name || 'Komunitas' }}</span>
                    <span>•</span>
                    <span class="capitalize">{{ c.visibility }}</span>
                  </div>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <Badge
                    v-if="c.status === 'takedown'"
                    variant="destructive"
                    class="text-[10px] py-0 px-2"
                  >
                    Ditakedown
                  </Badge>
                  <Badge
                    v-else
                    variant="outline"
                    class="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] py-0 px-2"
                  >
                    Tayang
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <!-- TAB 2: USER MANAGEMENT -->
      <TabsContent value="users" class="space-y-4">
        <!-- User Search & Filter Toolbar -->
        <Card class="border-border/80 bg-card p-4">
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div class="relative flex-1 max-w-sm">
              <Search class="size-3.5 text-muted-foreground absolute left-3 top-2.5" />
              <Input
                v-model="userSearch"
                placeholder="Cari nama atau email pengguna..."
                class="pl-9 h-8 text-xs bg-background"
              />
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <!-- Role Filter -->
              <select
                v-model="userRoleFilter"
                class="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="ALL">Semua Role</option>
                <option value="student">Student</option>
                <option value="curriculum">Curriculum</option>
                <option value="admin">Admin</option>
              </select>

              <!-- Status Filter -->
              <select
                v-model="userStatusFilter"
                class="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="ALL">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
          </div>
        </Card>

        <!-- User Table -->
        <Card class="border-border/80 bg-card shadow-2xs overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-xs text-left border-collapse">
              <thead>
                <tr class="bg-muted/50 border-b border-border/80 text-muted-foreground font-semibold">
                  <th class="p-3.5 pl-4">Pengguna</th>
                  <th class="p-3.5">Role</th>
                  <th class="p-3.5">Status</th>
                  <th class="p-3.5">Kursus Dibuat</th>
                  <th class="p-3.5">XP / Streak</th>
                  <th class="p-3.5">Terdaftar</th>
                  <th class="p-3.5 pr-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/60">
                <tr
                  v-for="u in filteredUsers"
                  :key="u.id"
                  class="hover:bg-muted/30 transition-colors"
                >
                  <!-- Nama & Email -->
                  <td class="p-3.5 pl-4">
                    <div class="flex items-center gap-3">
                      <div class="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {{ u.name.charAt(0).toUpperCase() }}
                      </div>
                      <div>
                        <div class="font-bold text-foreground flex items-center gap-1.5">
                          <span>{{ u.name }}</span>
                          <span v-if="u.id === currentUser?.id" class="text-[10px] text-muted-foreground font-normal">(Anda)</span>
                        </div>
                        <div class="text-[11px] text-muted-foreground font-mono">{{ u.email }}</div>
                      </div>
                    </div>
                  </td>

                  <!-- Role -->
                  <td class="p-3.5">
                    <Badge
                      variant="outline"
                      class="text-[10px] font-mono uppercase"
                      :class="u.role === 'admin'
                        ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30 font-bold'
                        : u.role === 'curriculum'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-muted text-muted-foreground'"
                    >
                      {{ u.role }}
                    </Badge>
                  </td>

                  <!-- Status -->
                  <td class="p-3.5">
                    <Badge
                      :variant="u.status === 'active' ? 'outline' : 'destructive'"
                      class="text-[10px] font-mono uppercase gap-1"
                      :class="u.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : ''"
                    >
                      <CheckCircle2 v-if="u.status === 'active'" class="size-2.5" />
                      <XCircle v-else class="size-2.5" />
                      <span>{{ u.status === 'active' ? 'Aktif' : 'Nonaktif' }}</span>
                    </Badge>
                  </td>

                  <!-- Kursus Dibuat -->
                  <td class="p-3.5 font-medium">
                    {{ u.coursesCount }} Kursus
                  </td>

                  <!-- XP / Streak -->
                  <td class="p-3.5">
                    <div class="font-mono text-[11px] font-semibold text-foreground">{{ u.xp.toLocaleString('id-ID') }} XP</div>
                    <div class="text-[10px] text-muted-foreground">{{ u.streak }} Hari Streak</div>
                  </td>

                  <!-- Terdaftar -->
                  <td class="p-3.5 text-muted-foreground text-[11px]">
                    {{ formatDate(u.createdAt) }}
                  </td>

                  <!-- Actions -->
                  <td class="p-3.5 pr-4 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      <!-- View Public Profile -->
                      <Button
                        variant="ghost"
                        size="icon"
                        class="size-7 text-muted-foreground hover:text-foreground"
                        title="Lihat Profil Publik"
                        @click="openUserProfile(u.id)"
                      >
                        <Eye class="size-3.5" />
                      </Button>

                      <!-- Change Role -->
                      <Button
                        variant="outline"
                        size="sm"
                        class="h-7 text-[10px] px-2"
                        title="Ubah Role Akun"
                        :disabled="u.id === currentUser?.id"
                        @click="promptChangeRole(u)"
                      >
                        Ganti Role
                      </Button>

                      <!-- Toggle Status (Activate / Inactivate) -->
                      <Button
                        v-if="u.status === 'active'"
                        variant="outline"
                        size="sm"
                        class="h-7 text-[10px] px-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                        title="Nonaktifkan Pengguna"
                        :disabled="u.id === currentUser?.id"
                        @click="promptUserStatusToggle(u)"
                      >
                        <UserX class="size-3 mr-1" />
                        <span>Nonaktifkan</span>
                      </Button>
                      <Button
                        v-else
                        variant="outline"
                        size="sm"
                        class="h-7 text-[10px] px-2 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                        title="Aktifkan Kembali Pengguna"
                        @click="promptUserStatusToggle(u)"
                      >
                        <UserCheck class="size-3 mr-1" />
                        <span>Aktifkan</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </TabsContent>

      <!-- TAB 3: COURSE MANAGEMENT & TAKEDOWN -->
      <TabsContent value="courses" class="space-y-4">
        <!-- Course Search & Filter Toolbar -->
        <Card class="border-border/80 bg-card p-4">
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div class="relative flex-1 max-w-sm">
              <Search class="size-3.5 text-muted-foreground absolute left-3 top-2.5" />
              <Input
                v-model="courseSearch"
                placeholder="Cari judul kursus atau nama pembuat..."
                class="pl-9 h-8 text-xs bg-background"
              />
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <!-- Status Filter -->
              <select
                v-model="courseStatusFilter"
                class="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="ALL">Semua Status</option>
                <option value="published">Tayang Normal</option>
                <option value="takedown">Ditakedown</option>
              </select>

              <!-- Visibility Filter -->
              <select
                v-model="courseVisibilityFilter"
                class="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="ALL">Semua Akses</option>
                <option value="public">Publik</option>
                <option value="private">Privat</option>
              </select>
            </div>
          </div>
        </Card>

        <!-- Course Table -->
        <Card class="border-border/80 bg-card shadow-2xs overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-xs text-left border-collapse">
              <thead>
                <tr class="bg-muted/50 border-b border-border/80 text-muted-foreground font-semibold">
                  <th class="p-3.5 pl-4">Kursus</th>
                  <th class="p-3.5">Pembuat</th>
                  <th class="p-3.5">Bahasa & Level</th>
                  <th class="p-3.5">Visibilitas</th>
                  <th class="p-3.5">Status Operasional</th>
                  <th class="p-3.5">Soal & Rating</th>
                  <th class="p-3.5 pr-4 text-right">Tindakan Admin</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/60">
                <tr
                  v-for="c in filteredCourses"
                  :key="c.id"
                  class="hover:bg-muted/30 transition-colors"
                >
                  <!-- Judul -->
                  <td class="p-3.5 pl-4">
                    <div class="font-bold text-foreground hover:underline cursor-pointer flex items-center gap-1.5" @click="openCourse(c.id)">
                      <span>{{ c.title }}</span>
                      <ArrowUpRight class="size-3 text-muted-foreground" />
                    </div>
                    <div class="text-[11px] text-muted-foreground truncate max-w-xs">{{ c.description || 'Tidak ada deskripsi' }}</div>
                    <div v-if="c.status === 'takedown' && c.takedownReason" class="mt-1 text-[10px] text-amber-600 dark:text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 max-w-xs">
                      Alasan: {{ c.takedownReason }}
                    </div>
                  </td>

                  <!-- Pembuat -->
                  <td class="p-3.5">
                    <div class="font-semibold text-foreground flex items-center gap-1">
                      <span>{{ c.author?.name || 'Komunitas' }}</span>
                      <Badge v-if="c.author?.isOfficial" variant="outline" class="text-[9px] px-1 py-0 h-4 border-emerald-500/40 text-emerald-600 bg-emerald-500/10">Resmi</Badge>
                    </div>
                    <div class="text-[10px] text-muted-foreground font-mono">{{ c.authorEmail || '-' }}</div>
                  </td>

                  <!-- Level & Target Language -->
                  <td class="p-3.5">
                    <div class="flex items-center gap-1.5">
                      <Badge variant="outline" class="font-mono text-[10px] py-0">{{ c.level }}</Badge>
                      <span class="text-[11px] text-muted-foreground">{{ c.category }}</span>
                    </div>
                  </td>

                  <!-- Visibilitas -->
                  <td class="p-3.5">
                    <Badge
                      variant="outline"
                      class="text-[10px] capitalize gap-1"
                      :class="c.visibility === 'public' ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'border-amber-500/30 text-amber-600'"
                    >
                      <Globe v-if="c.visibility === 'public'" class="size-2.5" />
                      <Lock v-else class="size-2.5" />
                      <span>{{ c.visibility }}</span>
                    </Badge>
                  </td>

                  <!-- Status (Published / Takedown) -->
                  <td class="p-3.5">
                    <Badge
                      v-if="c.status === 'takedown'"
                      variant="destructive"
                      class="text-[10px] gap-1 font-mono uppercase"
                    >
                      <AlertTriangle class="size-2.5" />
                      <span>Ditakedown</span>
                    </Badge>
                    <Badge
                      v-else
                      variant="outline"
                      class="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1 font-mono uppercase"
                    >
                      <CheckCircle2 class="size-2.5" />
                      <span>Tayang Normal</span>
                    </Badge>
                  </td>

                  <!-- Questions & Rating -->
                  <td class="p-3.5">
                    <div class="font-semibold text-foreground">{{ c.questionCount }} Soal</div>
                    <div class="text-[10px] text-muted-foreground">★ {{ c.avgRating }} ({{ c.totalReviews }} review)</div>
                  </td>

                  <!-- Admin Actions -->
                  <td class="p-3.5 pr-4 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      <!-- Takedown Action -->
                      <Button
                        v-if="c.status !== 'takedown'"
                        variant="destructive"
                        size="sm"
                        class="h-7 text-[10px] px-2.5"
                        @click="promptTakedownCourse(c)"
                      >
                        <ShieldAlert class="size-3 mr-1" />
                        <span>Takedown</span>
                      </Button>
                      <!-- Restore Action -->
                      <Button
                        v-else
                        variant="outline"
                        size="sm"
                        class="h-7 text-[10px] px-2.5 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                        @click="restoreCourse(c)"
                      >
                        <CheckCircle2 class="size-3 mr-1" />
                        <span>Pulihkan</span>
                      </Button>

                      <!-- Force Delete Action -->
                      <Button
                        variant="ghost"
                        size="icon"
                        class="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Hapus Permanen Kursus"
                        @click="forceDeleteCourse(c)"
                      >
                        <Trash2 class="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </TabsContent>

      <!-- TAB 4: QUIZ ACTIVITY LOGS -->
      <TabsContent value="activity" class="space-y-4">
        <Card class="border-border/80 bg-card shadow-2xs overflow-hidden">
          <CardHeader class="pb-3 border-b border-border/60">
            <CardTitle class="text-sm font-bold flex items-center gap-2">
              <Clock class="size-4 text-primary" />
              <span>Log Aktivitas & Pengerjaan Kuis Real-Time</span>
            </CardTitle>
            <CardDescription class="text-xs">25 riwayat pengerjaan modul kuis terakhir oleh seluruh pengguna di aplikasi</CardDescription>
          </CardHeader>
          <CardContent class="p-0">
            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left border-collapse">
                <thead>
                  <tr class="bg-muted/50 border-b border-border/80 text-muted-foreground font-semibold">
                    <th class="p-3.5 pl-4">Pengguna</th>
                    <th class="p-3.5">Modul Kuis</th>
                    <th class="p-3.5">Akurasi</th>
                    <th class="p-3.5">Jawaban Benar</th>
                    <th class="p-3.5">XP Didapat</th>
                    <th class="p-3.5 pr-4 text-right">Waktu Selesai</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/60">
                  <tr
                    v-for="a in quizActivities"
                    :key="a.id"
                    class="hover:bg-muted/30 transition-colors"
                  >
                    <td class="p-3.5 pl-4">
                      <div class="font-bold text-foreground">{{ a.userName || 'Pengguna' }}</div>
                      <div class="text-[10px] text-muted-foreground font-mono">{{ a.userEmail || '-' }}</div>
                    </td>
                    <td class="p-3.5 font-medium text-foreground">
                      {{ a.quizTitle }}
                    </td>
                    <td class="p-3.5">
                      <Badge
                        variant="outline"
                        class="font-mono text-[10px]"
                        :class="a.accuracy >= 80 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold' : 'bg-muted text-muted-foreground'"
                      >
                        {{ a.accuracy }}%
                      </Badge>
                    </td>
                    <td class="p-3.5 font-mono">
                      {{ a.correctCount }} / {{ a.totalQuestions }}
                    </td>
                    <td class="p-3.5 font-mono font-bold text-primary">
                      +{{ a.xpEarned }} XP
                    </td>
                    <td class="p-3.5 pr-4 text-right text-muted-foreground text-[11px]">
                      {{ formatDate(a.completedAt) }}
                    </td>
                  </tr>
                  <tr v-if="quizActivities.length === 0">
                    <td colspan="6" class="p-8 text-center text-muted-foreground text-xs">
                      Belum ada riwayat aktivitas kuis yang tercatat.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    <!-- DIALOG: CONFIRM COURSE TAKEDOWN -->
    <Dialog v-model:open="isTakedownDialogOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2 text-destructive text-base font-bold">
            <ShieldAlert class="size-5" />
            <span>Takedown Modul Kursus</span>
          </DialogTitle>
          <DialogDescription class="text-xs">
            Kursus ini akan langsung dinonaktifkan dan disembunyikan dari katalog publik. Siswa tidak akan dapat mengakses modul maupun kuis kursus ini sampai Anda memulihkannya kembali.
          </DialogDescription>
        </DialogHeader>

        <div v-if="selectedCourseForTakedown" class="space-y-3 py-2">
          <div class="p-3 rounded-lg bg-muted border border-border text-xs space-y-1">
            <div class="font-bold text-foreground">{{ selectedCourseForTakedown.title }}</div>
            <div class="text-muted-foreground text-[11px]">Pembuat: {{ selectedCourseForTakedown.author?.name || 'Komunitas' }}</div>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-foreground">Alasan Takedown *</label>
            <textarea
              v-model="takedownReasonInput"
              rows="3"
              placeholder="Jelaskan alasan tindakan penonaktifan ini..."
              class="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground resize-none"
            />
          </div>
        </div>

        <DialogFooter class="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" @click="isTakedownDialogOpen = false">
            Batal
          </Button>
          <Button
            variant="destructive"
            size="sm"
            class="gap-1.5"
            :disabled="isTakedownActionLoading"
            @click="confirmTakedownCourse"
          >
            <ShieldAlert class="size-3.5" />
            <span>{{ isTakedownActionLoading ? 'Memproses...' : 'Konfirmasi Takedown' }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- DIALOG: CONFIRM USER STATUS (ACTIVATE / INACTIVATE) -->
    <Dialog v-model:open="isUserStatusDialogOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2 text-base font-bold" :class="targetUserStatus === 'inactive' ? 'text-destructive' : 'text-emerald-600'">
            <UserX v-if="targetUserStatus === 'inactive'" class="size-5" />
            <UserCheck v-else class="size-5" />
            <span>{{ targetUserStatus === 'inactive' ? 'Nonaktifkan Akun Pengguna' : 'Aktifkan Kembali Pengguna' }}</span>
          </DialogTitle>
          <DialogDescription class="text-xs">
            <span v-if="targetUserStatus === 'inactive'">
              Pengguna yang dinonaktifkan tidak akan dapat masuk (login) ke aplikasi. Anda dapat mengaktifkannya kembali sewaktu-waktu.
            </span>
            <span v-else>
              Pengguna ini akan diizinkan kembali untuk login dan menggunakan aplikasi seperti semula.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div v-if="selectedUserForStatus" class="p-3 rounded-lg bg-muted border border-border text-xs space-y-1 my-2">
          <div class="font-bold text-foreground">{{ selectedUserForStatus.name }}</div>
          <div class="text-muted-foreground font-mono text-[11px]">{{ selectedUserForStatus.email }}</div>
        </div>

        <DialogFooter class="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" @click="isUserStatusDialogOpen = false">
            Batal
          </Button>
          <Button
            :variant="targetUserStatus === 'inactive' ? 'destructive' : 'default'"
            size="sm"
            class="gap-1.5"
            :disabled="isUserStatusActionLoading"
            @click="confirmUserStatusToggle"
          >
            <span>{{ isUserStatusActionLoading ? 'Memproses...' : targetUserStatus === 'inactive' ? 'Nonaktifkan Akun' : 'Aktifkan Akun' }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- DIALOG: CHANGE USER ROLE -->
    <Dialog v-model:open="isRoleDialogOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2 text-base font-bold text-foreground">
            <Shield class="size-5 text-primary" />
            <span>Ubah Hak Akses / Role Pengguna</span>
          </DialogTitle>
          <DialogDescription class="text-xs">
            Tentukan tingkat akses dan hak istimewa akun ini dalam sistem LMS.
          </DialogDescription>
        </DialogHeader>

        <div v-if="selectedUserForRole" class="space-y-4 py-2">
          <div class="p-3 rounded-lg bg-muted border border-border text-xs space-y-1">
            <div class="font-bold text-foreground">{{ selectedUserForRole.name }}</div>
            <div class="text-muted-foreground font-mono text-[11px]">{{ selectedUserForRole.email }}</div>
          </div>

          <div class="space-y-2">
            <label class="text-xs font-semibold text-foreground">Pilih Role Baru:</label>
            <div class="grid grid-cols-3 gap-2">
              <div
                class="border rounded-lg p-2.5 text-center cursor-pointer transition-all"
                :class="targetUserRole === 'student' ? 'border-primary bg-primary/10 font-bold text-primary' : 'border-border/80 hover:bg-muted/50 text-foreground'"
                @click="targetUserRole = 'student'"
              >
                <div class="text-xs font-semibold">Student</div>
                <div class="text-[10px] text-muted-foreground">Pembelajar</div>
              </div>
              <div
                class="border rounded-lg p-2.5 text-center cursor-pointer transition-all"
                :class="targetUserRole === 'curriculum' ? 'border-emerald-500 bg-emerald-500/10 font-bold text-emerald-600' : 'border-border/80 hover:bg-muted/50 text-foreground'"
                @click="targetUserRole = 'curriculum'"
              >
                <div class="text-xs font-semibold">Curriculum</div>
                <div class="text-[10px] text-muted-foreground">Tim Resmi</div>
              </div>
              <div
                class="border rounded-lg p-2.5 text-center cursor-pointer transition-all"
                :class="targetUserRole === 'admin' ? 'border-indigo-500 bg-indigo-500/10 font-bold text-indigo-600' : 'border-border/80 hover:bg-muted/50 text-foreground'"
                @click="targetUserRole = 'admin'"
              >
                <div class="text-xs font-semibold">Admin</div>
                <div class="text-[10px] text-muted-foreground">Super Admin</div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter class="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" @click="isRoleDialogOpen = false">
            Batal
          </Button>
          <Button
            size="sm"
            class="gap-1.5"
            :disabled="isRoleActionLoading"
            @click="confirmUserRoleChange"
          >
            <span>{{ isRoleActionLoading ? 'Menyimpan...' : 'Simpan Role' }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
