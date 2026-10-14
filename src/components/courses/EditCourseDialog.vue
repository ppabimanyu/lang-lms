<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Course, CourseVisibility } from '@/types'
import { updateCourseMetadata } from '@/lib/storage'
import { SUPPORTED_LANGUAGES } from '@/lib/tts'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Settings2,
  Globe,
  Lock,
  Timer,
  Sparkles,
  Save,
  Loader2,
  AlertCircle
} from '@lucide/vue'

const props = defineProps<{
  open: boolean
  course: Course | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'saved', course: Course): void
}>()

// Form reactive fields
const title = ref('')
const description = ref('')
const level = ref('A1')
const category = ref('Umum')
const visibility = ref<CourseVisibility>('public')
const examDurationMinutes = ref(15)
const examPassingScore = ref(80)
const targetLanguage = ref('de-DE')

const isSaving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Predefined options
const levelOptions = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const categorySuggestions = ['Grammatik', 'Wortschatz', 'Konversation', 'Alltag', 'Latihan', 'Umum']
const timerPresets = [
  { minutes: 5, label: '5 Menit', desc: 'Kilat' },
  { minutes: 10, label: '10 Menit', desc: 'Standar' },
  { minutes: 15, label: '15 Menit', desc: 'Mendalam' },
  { minutes: 30, label: '30 Menit', desc: 'Komprehensif' },
]

// Sync form values whenever dialog opens or course changes
watch(
  () => props.course,
  (c) => {
    if (c) {
      title.value = c.title || ''
      description.value = c.description || ''
      level.value = c.level || 'A1'
      category.value = c.category || 'Umum'
      visibility.value = c.visibility || 'public'
      examDurationMinutes.value = c.examDurationMinutes || 15
      examPassingScore.value = c.examPassingScore || 80
      targetLanguage.value = c.targetLanguage || 'de-DE'
      errorMessage.value = ''
      successMessage.value = ''
    }
  },
  { immediate: true }
)

async function handleSave() {
  if (!props.course) return
  if (!title.value.trim()) {
    errorMessage.value = 'Judul kursus tidak boleh kosong.'
    return
  }

  const duration = Number(examDurationMinutes.value)
  if (isNaN(duration) || duration < 1 || duration > 180) {
    errorMessage.value = 'Batas waktu ujian harus antara 1 sampai 180 menit.'
    return
  }

  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const res = await updateCourseMetadata(props.course.id, {
      title: title.value.trim(),
      description: description.value.trim(),
      level: level.value,
      category: category.value.trim() || 'Umum',
      visibility: visibility.value,
      examDurationMinutes: duration,
      examPassingScore: Number(examPassingScore.value) || 80,
      targetLanguage: targetLanguage.value,
    })

    successMessage.value = 'Metadata kursus berhasil diperbarui!'
    emit('saved', res.course)

    setTimeout(() => {
      emit('update:open', false)
      successMessage.value = ''
    }, 600)
  } catch (err: any) {
    console.error('Error saving course metadata:', err)
    errorMessage.value = err.message || 'Gagal menyimpan metadata kursus.'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <div class="flex items-center gap-2.5">
          <div class="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <Settings2 class="size-5" />
          </div>
          <div>
            <DialogTitle class="text-base font-bold">Edit Metadata Kursus</DialogTitle>
            <DialogDescription class="text-xs">
              Ubah judul, visibilitas akses, dan durasi batas waktu kuis untuk kursus ini.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <!-- Error / Success Alert -->
      <div v-if="errorMessage" class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
        <AlertCircle class="size-4 shrink-0" />
        <span>{{ errorMessage }}</span>
      </div>
      <div v-if="successMessage" class="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 font-medium">
        <Sparkles class="size-4 shrink-0" />
        <span>{{ successMessage }}</span>
      </div>

      <div class="space-y-4 py-1 text-xs">
        <!-- 1. Judul Kursus -->
        <div class="space-y-1.5">
          <label class="font-semibold text-foreground flex items-center justify-between">
            <span>Judul Kursus <span class="text-destructive">*</span></span>
            <span class="text-[11px] text-muted-foreground font-normal font-mono">{{ title.length }}/100</span>
          </label>
          <Input
            v-model="title"
            placeholder="Contoh: Tata Bahasa Dasar - Artikel & Nomen"
            maxlength="100"
            class="h-9 text-xs"
            :disabled="isSaving"
          />
        </div>

        <!-- 2. Deskripsi -->
        <div class="space-y-1.5">
          <label class="font-semibold text-foreground">Deskripsi Singkat</label>
          <textarea
            v-model="description"
            rows="2"
            placeholder="Jelaskan ringkasan materi atau tujuan pembelajaran dari kursus ini..."
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            :disabled="isSaving"
          />
        </div>

        <!-- 3. Visibilitas Akses (Publik vs Privat) -->
        <div class="space-y-2">
          <label class="font-semibold text-foreground flex items-center gap-1.5">
            <span>Pengaturan Akses & Visibilitas</span>
          </label>
          <div class="grid grid-cols-2 gap-2.5">
            <!-- Pilihan Publik -->
            <button
              type="button"
              @click="visibility = 'public'"
              :class="[
                'p-3 rounded-xl border text-left transition-all relative overflow-hidden',
                visibility === 'public'
                  ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-950/20 shadow-xs'
                  : 'border-border hover:bg-muted/40 hover:border-border/80'
              ]"
            >
              <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-1.5 font-bold text-foreground">
                  <Globe class="size-4 text-emerald-500" />
                  <span>Publik</span>
                </div>
                <Badge v-if="visibility === 'public'" class="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0">
                  Aktif
                </Badge>
              </div>
              <p class="text-[11px] text-muted-foreground leading-normal">
                Dapat dilihat & dipelajari semua pengguna di Katalog.
              </p>
            </button>

            <!-- Pilihan Privat -->
            <button
              type="button"
              @click="visibility = 'private'"
              :class="[
                'p-3 rounded-xl border text-left transition-all relative overflow-hidden',
                visibility === 'private'
                  ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-950/20 shadow-xs'
                  : 'border-border hover:bg-muted/40 hover:border-border/80'
              ]"
            >
              <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-1.5 font-bold text-foreground">
                  <Lock class="size-4 text-amber-500" />
                  <span>Privat</span>
                </div>
                <Badge v-if="visibility === 'private'" class="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0">
                  Aktif
                </Badge>
              </div>
              <p class="text-[11px] text-muted-foreground leading-normal">
                Hanya Anda yang dapat mengakses kursus ini.
              </p>
            </button>
          </div>
        </div>

        <!-- 4. Timer Waktu Ujian Akhir (Durasi Menit) -->
        <div class="space-y-2 p-3 rounded-xl bg-muted/40 border border-border/80">
          <div class="flex items-center justify-between">
            <label class="font-semibold text-foreground flex items-center gap-1.5">
              <Timer class="size-4 text-amber-500" />
              <span>Batas Waktu Ujian Akhir Kelulusan</span>
            </label>
            <span class="font-bold text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
              {{ examDurationMinutes }} Menit
            </span>
          </div>

          <!-- Presets -->
          <div class="grid grid-cols-4 gap-1.5">
            <button
              v-for="p in timerPresets"
              :key="p.minutes"
              type="button"
              @click="examDurationMinutes = p.minutes"
              :class="[
                'px-2 py-1.5 rounded-lg border text-center transition-all',
                examDurationMinutes === p.minutes
                  ? 'border-primary bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'border-border bg-card hover:bg-muted text-foreground'
              ]"
            >
              <div class="text-[11px] font-bold leading-tight">{{ p.label }}</div>
              <div class="text-[9px] opacity-80 leading-none mt-0.5">{{ p.desc }}</div>
            </button>
          </div>

          <!-- Custom Slider / Number Input -->
          <div class="flex items-center gap-3 pt-1">
            <span class="text-[11px] text-muted-foreground shrink-0">Custom (menit):</span>
            <input
              type="range"
              min="5"
              max="60"
              step="1"
              v-model.number="examDurationMinutes"
              class="w-full accent-primary cursor-pointer"
            />
            <Input
              type="number"
              min="1"
              max="180"
              v-model.number="examDurationMinutes"
              class="w-16 h-8 text-center text-xs font-mono font-semibold"
            />
          </div>
        </div>

        <!-- 5. Level & Kategori -->
        <div class="grid grid-cols-2 gap-3">
          <!-- Level CEFR -->
          <div class="space-y-1.5">
            <label class="font-semibold text-foreground">Tingkat Level</label>
            <div class="flex flex-wrap gap-1">
              <button
                v-for="lvl in levelOptions"
                :key="lvl"
                type="button"
                @click="level = lvl"
                :class="[
                  'px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors',
                  level === lvl
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card hover:bg-muted text-muted-foreground'
                ]"
              >
                {{ lvl }}
              </button>
            </div>
          </div>

          <!-- Bahasa Target -->
          <div class="space-y-1.5">
            <label class="font-semibold text-foreground">Bahasa Kursus</label>
            <select
              v-model="targetLanguage"
              class="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option
                v-for="lang in SUPPORTED_LANGUAGES"
                :key="lang.code"
                :value="lang.code"
              >
                {{ lang.flag }} {{ lang.name }} ({{ lang.code }})
              </option>
            </select>
          </div>
        </div>

        <!-- 6. Kategori -->
        <div class="space-y-1.5">
          <label class="font-semibold text-foreground">Kategori Kursus</label>
          <Input
            v-model="category"
            placeholder="Kategori materi..."
            class="h-9 text-xs"
            :disabled="isSaving"
          />
          <div class="flex flex-wrap gap-1 pt-0.5">
            <button
              v-for="c in categorySuggestions"
              :key="c"
              type="button"
              @click="category = c"
              class="text-[10px] px-2 py-0.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground border border-border/60 transition-colors"
            >
              + {{ c }}
            </button>
          </div>
        </div>
      </div>

      <DialogFooter class="gap-2 sm:gap-0 pt-2 border-t border-border/60">
        <Button
          type="button"
          variant="outline"
          size="sm"
          @click="emit('update:open', false)"
          :disabled="isSaving"
        >
          Batal
        </Button>
        <Button
          type="button"
          size="sm"
          class="font-semibold gap-1.5"
          @click="handleSave"
          :disabled="isSaving"
        >
          <Loader2 v-if="isSaving" class="size-3.5 animate-spin" />
          <Save v-else class="size-3.5" />
          <span>{{ isSaving ? 'Menyimpan...' : 'Simpan Perubahan' }}</span>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
