<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '@/lib/api'
import type { AdminCourseItem, Course } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import {
  BookOpen,
  Search,
  RefreshCw,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  Globe,
  Lock,
  FileText,
  HelpCircle
} from '@lucide/vue'

const coursesList = ref<AdminCourseItem[]>([])
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

// Filters
const courseSearch = ref('')
const courseStatusFilter = ref('ALL')
const courseVisibilityFilter = ref('ALL')

// Takedown Dialog States
const isTakedownDialogOpen = ref(false)
const selectedCourseForTakedown = ref<AdminCourseItem | null>(null)
const takedownReasonInput = ref('Konten tidak sesuai atau melanggar pedoman kurikulum.')
const isTakedownActionLoading = ref(false)

// Audit / Preview Modal States
const isAuditModalOpen = ref(false)
const auditCourseDetail = ref<Course | null>(null)
const isAuditLoading = ref(false)
const auditActiveSection = ref<'markdown' | 'questions'>('markdown')

async function fetchCourses() {
  isLoading.value = true
  errorMessage.value = null
  try {
    const data = await api.admin.getCourses()
    coursesList.value = data
  } catch (err: any) {
    errorMessage.value = err.message || 'Gagal memuat daftar kursus.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchCourses()
})

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

// --- AUDIT PREVIEW MODAL ---
async function openAuditModal(course: AdminCourseItem) {
  isAuditModalOpen.value = true
  isAuditLoading.value = true
  auditCourseDetail.value = null
  auditActiveSection.value = 'markdown'
  try {
    const fullCourse = await api.courses.getById(course.id)
    auditCourseDetail.value = fullCourse
  } catch (err: any) {
    errorMessage.value = err.message || 'Gagal memuat detail kursus untuk diaudit.'
  } finally {
    isAuditLoading.value = false
  }
}

// --- TAKEDOWN & RESTORE ACTIONS ---
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
    if (auditCourseDetail.value && auditCourseDetail.value.id === selectedCourseForTakedown.value.id) {
      auditCourseDetail.value.status = 'takedown'
      auditCourseDetail.value.takedownReason = takedownReasonInput.value
    }
    await fetchCourses()
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
    if (auditCourseDetail.value && auditCourseDetail.value.id === course.id) {
      auditCourseDetail.value.status = 'published'
    }
    await fetchCourses()
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
    if (isAuditModalOpen.value && auditCourseDetail.value?.id === course.id) {
      isAuditModalOpen.value = false
    }
    await fetchCourses()
    setTimeout(() => { successMessage.value = null }, 4000)
  } catch (err: any) {
    errorMessage.value = err.message || 'Gagal menghapus kursus.'
  }
}

function formatDate(dateStr?: string | number): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return String(dateStr)
  }
}
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          Moderasi & Manajemen Kursus
          <Badge variant="outline" class="font-mono text-[11px] bg-muted/60">
            {{ filteredCourses.length }} Kursus
          </Badge>
        </h1>
        <p class="text-xs text-muted-foreground mt-0.5">
          Audit materi kurikulum, cek bank soal yang diunggah, serta lakukan takedown instan untuk konten yang bermasalah.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          class="gap-1.5 text-xs h-8 bg-card cursor-pointer"
          :disabled="isLoading"
          @click="fetchCourses"
        >
          <RefreshCw class="size-3.5" :class="{ 'animate-spin': isLoading }" />
          <span>Segarkan</span>
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

    <!-- Search & Filters -->
    <Card class="border-border/80 bg-card shadow-xs">
      <CardContent class="p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div class="relative flex-1">
          <Search class="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            v-model="courseSearch"
            placeholder="Cari judul kursus, pembuat, atau kategori..."
            class="pl-9 h-9 text-xs bg-background"
          />
        </div>

        <div class="flex items-center gap-2 overflow-x-auto">
          <!-- Status Filter -->
          <div class="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60 text-xs">
            <button
              v-for="s in ['ALL', 'published', 'takedown']"
              :key="s"
              @click="courseStatusFilter = s"
              class="px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
              :class="courseStatusFilter === s ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'"
            >
              {{ s === 'ALL' ? 'Semua Status' : s === 'published' ? 'Tayang' : 'Takedown' }}
            </button>
          </div>

          <!-- Visibility Filter -->
          <div class="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60 text-xs">
            <button
              v-for="v in ['ALL', 'public', 'private']"
              :key="v"
              @click="courseVisibilityFilter = v"
              class="px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
              :class="courseVisibilityFilter === v ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'"
            >
              {{ v === 'ALL' ? 'Semua Visibilitas' : v === 'public' ? 'Publik' : 'Privat' }}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Courses Table -->
    <Card class="border-border/80 bg-card shadow-xs overflow-hidden">
      <CardContent class="p-0">
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left">
            <thead class="bg-muted/50 border-b border-border/80 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th class="py-3 px-4">Modul Kursus</th>
                <th class="py-3 px-4">Pembuat</th>
                <th class="py-3 px-4">Konten</th>
                <th class="py-3 px-4">Status & Visibilitas</th>
                <th class="py-3 px-4">Tanggal Dibuat</th>
                <th class="py-3 px-4 text-right">Aksi Moderasi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border/60">
              <tr v-if="filteredCourses.length === 0">
                <td colspan="6" class="py-10 text-center text-muted-foreground">
                  Tidak ada kursus yang cocok dengan kriteria filter.
                </td>
              </tr>
              <tr
                v-for="course in filteredCourses"
                :key="course.id"
                class="hover:bg-muted/30 transition-colors"
                :class="{ 'opacity-70 bg-amber-500/5': course.status === 'takedown' }"
              >
                <!-- Info Kursus -->
                <td class="py-3.5 px-4 max-w-xs">
                  <div class="flex items-start gap-2.5">
                    <div class="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <BookOpen class="size-4" />
                    </div>
                    <div class="min-w-0">
                      <div class="font-semibold text-foreground truncate flex items-center gap-1.5">
                        <span>{{ course.title }}</span>
                        <Badge variant="outline" class="text-[9px] uppercase px-1 py-0 font-mono">
                          {{ course.level }}
                        </Badge>
                      </div>
                      <div class="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5 truncate">
                        <span>{{ course.category }}</span>
                        <span>•</span>
                        <span>{{ course.targetLanguage }}</span>
                      </div>
                      <!-- Takedown note if any -->
                      <div v-if="course.status === 'takedown' && course.takedownReason" class="mt-1 text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded border border-destructive/20 inline-block truncate max-w-full">
                        Alasan: {{ course.takedownReason }}
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Pembuat -->
                <td class="py-3.5 px-4">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-medium text-foreground">{{ course.author?.name || 'Tim Kurikulum Lingua' }}</span>
                    <Badge v-if="course.author?.isOfficial" variant="secondary" class="text-[9px] px-1 py-0 bg-primary/15 text-primary border-primary/20">
                      Resmi
                    </Badge>
                    <Badge
                      v-else-if="course.author?.isPartner"
                      variant="outline"
                      class="text-[9px] px-1 py-0 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 gap-0.5"
                    >
                      <ShieldCheck class="size-2.5" />
                      Partner
                    </Badge>
                  </div>
                </td>

                <!-- Konten: Soal & Rating -->
                <td class="py-3.5 px-4">
                  <div class="space-y-0.5 font-mono text-[11px]">
                    <div>{{ course.questionCount || 0 }} Soal</div>
                    <div class="text-muted-foreground flex items-center gap-1">
                      <span>★ {{ course.avgRating ? course.avgRating.toFixed(1) : '5.0' }}</span>
                      <span class="text-[10px]">({{ course.totalReviews || 0 }})</span>
                    </div>
                  </div>
                </td>

                <!-- Status & Visibilitas -->
                <td class="py-3.5 px-4">
                  <div class="flex flex-col gap-1 items-start">
                    <Badge
                      :variant="course.status === 'takedown' ? 'destructive' : 'outline'"
                      class="text-[10px]"
                      :class="course.status !== 'takedown' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' : ''"
                    >
                      {{ course.status === 'takedown' ? 'Di-takedown' : 'Tayang' }}
                    </Badge>
                    <span class="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                      <component :is="course.visibility === 'public' ? Globe : Lock" class="size-3" />
                      <span>{{ course.visibility === 'public' ? 'Publik' : 'Privat' }}</span>
                    </span>
                  </div>
                </td>

                <!-- Tanggal Dibuat -->
                <td class="py-3.5 px-4 text-muted-foreground text-[11px] font-mono">
                  {{ formatDate(course.createdAt) }}
                </td>

                <!-- Aksi -->
                <td class="py-3.5 px-4 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <!-- Audit Kursus Preview -->
                    <Button
                      variant="outline"
                      size="sm"
                      class="h-7 px-2 text-xs gap-1 cursor-pointer bg-card hover:bg-muted"
                      @click="openAuditModal(course)"
                      title="Audit Isi Materi & Soal"
                    >
                      <Eye class="size-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Audit</span>
                    </Button>

                    <!-- Toggle Takedown / Pulihkan -->
                    <Button
                      v-if="course.status !== 'takedown'"
                      variant="ghost"
                      size="sm"
                      class="h-7 px-2 text-xs gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 cursor-pointer"
                      @click="promptTakedownCourse(course)"
                      title="Takedown Kursus"
                    >
                      <AlertTriangle class="size-3.5" />
                      <span>Takedown</span>
                    </Button>
                    <Button
                      v-else
                      variant="outline"
                      size="sm"
                      class="h-7 px-2 text-xs gap-1 text-emerald-600 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 cursor-pointer"
                      @click="restoreCourse(course)"
                      title="Pulihkan Kursus"
                    >
                      <CheckCircle2 class="size-3.5" />
                      <span>Pulihkan</span>
                    </Button>

                    <!-- Hapus Permanen -->
                    <Button
                      variant="ghost"
                      size="sm"
                      class="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      @click="forceDeleteCourse(course)"
                      title="Hapus Permanen Kursus"
                    >
                      <Trash2 class="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>

    <!-- MODAL: AUDIT & PRATINJAU KURSUS -->
    <Dialog :open="isAuditModalOpen" @update:open="isAuditModalOpen = $event">
      <DialogContent class="sm:max-w-3xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader class="border-b border-border/80 pb-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <Badge variant="outline" class="font-mono text-[10px] uppercase">
                  {{ auditCourseDetail?.level || 'A1' }}
                </Badge>
                <Badge
                  :variant="auditCourseDetail?.status === 'takedown' ? 'destructive' : 'outline'"
                  class="text-[10px]"
                  :class="auditCourseDetail?.status !== 'takedown' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' : ''"
                >
                  {{ auditCourseDetail?.status === 'takedown' ? 'Di-takedown' : 'Tayang' }}
                </Badge>
                <Badge variant="secondary" class="text-[10px]">
                  {{ auditCourseDetail?.visibility === 'public' ? 'Publik' : 'Privat' }}
                </Badge>
              </div>
              <DialogTitle class="text-xl font-bold tracking-tight text-foreground mt-1.5">
                {{ auditCourseDetail?.title || 'Memuat Kursus...' }}
              </DialogTitle>
              <DialogDescription class="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                <span>Dibuat oleh: <span class="font-semibold text-foreground">{{ auditCourseDetail?.author?.name || 'Tim Kurikulum' }}</span></span>
                <Badge v-if="auditCourseDetail?.author?.isOfficial" variant="secondary" class="text-[9px] px-1 py-0 bg-primary/15 text-primary border-primary/20">
                  Resmi
                </Badge>
                <Badge
                  v-else-if="auditCourseDetail?.author?.isPartner"
                  variant="outline"
                  class="text-[9px] px-1 py-0 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 gap-0.5"
                >
                  <ShieldCheck class="size-2.5" />
                  Verified Partner
                </Badge>
                <span>• Kategori: {{ auditCourseDetail?.category }} • Bahasa: {{ auditCourseDetail?.targetLanguage }}</span>
              </DialogDescription>
            </div>
          </div>

          <!-- Section Switcher Tabs -->
          <div class="flex items-center gap-2 pt-3">
            <button
              @click="auditActiveSection = 'markdown'"
              class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              :class="auditActiveSection === 'markdown' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-muted/70 text-muted-foreground hover:text-foreground'"
            >
              <FileText class="size-3.5" />
              <span>Materi Bacaan (Markdown)</span>
            </button>
            <button
              @click="auditActiveSection = 'questions'"
              class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              :class="auditActiveSection === 'questions' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-muted/70 text-muted-foreground hover:text-foreground'"
            >
              <HelpCircle class="size-3.5" />
              <span>Bank Soal ({{ auditCourseDetail?.questions?.length || 0 }} Soal)</span>
            </button>
          </div>
        </DialogHeader>

        <!-- Modal Body Content -->
        <div class="flex-1 overflow-y-auto py-4 space-y-4">
          <div v-if="isAuditLoading" class="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
            <RefreshCw class="size-5 animate-spin text-primary" />
            <span>Memuat materi kursus...</span>
          </div>

          <!-- Section 1: Markdown Content -->
          <div v-else-if="auditActiveSection === 'markdown'">
            <div v-if="auditCourseDetail?.markdownContent" class="p-4 rounded-xl bg-muted/30 border border-border/60 text-xs leading-relaxed space-y-3 font-mono whitespace-pre-wrap select-text">
              {{ auditCourseDetail.markdownContent }}
            </div>
            <div v-else class="py-12 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border/80">
              Kursus ini tidak memiliki modul materi bacaan markdown (hanya bank soal interaktif).
            </div>
          </div>

          <!-- Section 2: Questions Bank -->
          <div v-else-if="auditActiveSection === 'questions'" class="space-y-3">
            <div v-if="!auditCourseDetail?.questions || auditCourseDetail.questions.length === 0" class="py-12 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border/80">
              Belum ada soal kuis yang terhubung pada kursus ini.
            </div>
            <div
              v-for="(q, idx) in auditCourseDetail?.questions"
              :key="q.id || idx"
              class="p-3.5 rounded-xl border border-border/70 bg-card space-y-2 text-xs"
            >
              <div class="flex items-center justify-between">
                <span class="font-bold text-foreground">Soal #{{ idx + 1 }}</span>
                <Badge variant="outline" class="text-[9px] font-mono uppercase">
                  Tipe: {{ q.type }}
                </Badge>
              </div>

              <!-- Question text -->
              <div class="font-medium text-foreground text-sm">
                {{ q.question }}
              </div>

              <!-- Options if choice -->
              <div v-if="q.options && q.options.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div
                  v-for="(opt, oIdx) in q.options"
                  :key="oIdx"
                  class="p-2 rounded-lg border text-xs flex items-center justify-between"
                  :class="opt === q.answer ? 'border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-semibold' : 'border-border/60 text-muted-foreground'"
                >
                  <span>{{ opt }}</span>
                  <CheckCircle2 v-if="opt === q.answer" class="size-3.5 text-emerald-600" />
                </div>
              </div>

              <!-- Answer key if not in options list -->
              <div v-else class="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-mono text-xs">
                Kunci Jawaban: <span class="font-bold">{{ q.answer }}</span>
              </div>

              <!-- Translation & Explanation -->
              <div class="text-[11px] text-muted-foreground space-y-1 pt-1 border-t border-border/50">
                <div v-if="q.translation"><span class="font-semibold text-foreground">Arti:</span> {{ q.translation }}</div>
                <div v-if="q.explanation"><span class="font-semibold text-foreground">Penjelasan:</span> {{ q.explanation }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer with Takedown / Pulihkan Quick Actions -->
        <DialogFooter class="border-t border-border/80 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <!-- Takedown or Pulihkan button directly in modal -->
            <Button
              v-if="auditCourseDetail?.status !== 'takedown'"
              variant="destructive"
              size="sm"
              class="text-xs h-8 gap-1.5 cursor-pointer"
              @click="promptTakedownCourse(auditCourseDetail as any)"
            >
              <AlertTriangle class="size-3.5" />
              <span>Takedown Kursus Ini</span>
            </Button>
            <Button
              v-else
              variant="default"
              size="sm"
              class="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              @click="restoreCourse(auditCourseDetail as any)"
            >
              <CheckCircle2 class="size-3.5" />
              <span>Pulihkan Kursus</span>
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            class="text-xs h-8 cursor-pointer"
            @click="isAuditModalOpen = false"
          >
            Tutup Pratinjau
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Dialog: Konfirmasi Takedown Kursus -->
    <Dialog :open="isTakedownDialogOpen" @update:open="isTakedownDialogOpen = $event">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <div class="flex items-center gap-2">
            <div class="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <ShieldAlert class="size-4" />
            </div>
            <DialogTitle class="text-base">Konfirmasi Takedown Kursus</DialogTitle>
          </div>
          <DialogDescription class="text-xs pt-1.5 leading-relaxed">
            Kursus <span class="font-semibold text-foreground">{{ selectedCourseForTakedown?.title }}</span>
            akan disembunyikan dari katalog publik dan tidak bisa diakses oleh murid non-admin.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-2 py-2">
          <label class="text-xs font-semibold text-foreground">Alasan Takedown Moderasi:</label>
          <textarea
            v-model="takedownReasonInput"
            rows="3"
            placeholder="Tuliskan catatan alasan moderasi..."
            class="w-full text-xs p-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          ></textarea>
        </div>

        <DialogFooter class="gap-2 sm:gap-0 pt-2">
          <Button
            variant="outline"
            size="sm"
            class="text-xs h-8 cursor-pointer"
            :disabled="isTakedownActionLoading"
            @click="isTakedownDialogOpen = false"
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            size="sm"
            class="text-xs h-8 gap-1.5 cursor-pointer"
            :disabled="isTakedownActionLoading"
            @click="confirmTakedownCourse"
          >
            <RefreshCw v-if="isTakedownActionLoading" class="size-3.5 animate-spin" />
            <span>Takedown Sekarang</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
