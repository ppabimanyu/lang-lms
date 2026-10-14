<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '@/lib/api'
import { setLocalFlag } from '@/lib/featureFlags'
import type { FeatureFlagItem } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import {
  SlidersHorizontal,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  UserPlus,
  BookOpen,
  Star,
  Award,
  Trophy,
  Volume2,
  Info,
  Clock,
  UserCheck,
  Layers,
  Zap,
} from '@lucide/vue'

const flagsList = ref<FeatureFlagItem[]>([])
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

// Filters
const searchQuery = ref('')
const selectedCategory = ref<string>('ALL')

// Confirmation Dialog for Critical Toggles
const isCriticalDialogOpen = ref(false)
const pendingFlag = ref<FeatureFlagItem | null>(null)
const pendingTargetState = ref<boolean>(false)
const isUpdating = ref(false)

// Reset Dialog
const isResetDialogOpen = ref(false)
const isResetting = ref(false)

async function fetchFlags() {
  isLoading.value = true
  errorMessage.value = null
  try {
    const data = await api.admin.getFeatureFlags()
    flagsList.value = data
  } catch (err: any) {
    errorMessage.value = err.message || 'Gagal memuat daftar feature flags.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchFlags()
})

const filteredFlags = computed(() => {
  let list = flagsList.value
  if (selectedCategory.value !== 'ALL') {
    list = list.filter(f => f.category === selectedCategory.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(
      f =>
        f.name.toLowerCase().includes(q) ||
        f.key.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q)
    )
  }
  return list
})

// Metrics computation
const stats = computed(() => {
  const total = flagsList.value.length
  const activeCount = flagsList.value.filter(f => f.enabled).length
  const inactiveCount = total - activeCount
  const isMaintenance = flagsList.value.find(f => f.key === 'maintenance_mode')?.enabled ?? false
  return { total, activeCount, inactiveCount, isMaintenance }
})

// Categories metadata
const categories = [
  { id: 'ALL', label: 'Semua Kategori' },
  { id: 'system', label: 'Sistem & Akses' },
  { id: 'learning', label: 'Pembelajaran' },
  { id: 'interaction', label: 'Interaksi & Ulasan' },
  { id: 'gamification', label: 'Gamifikasi' }
]

function getFlagIcon(key: string) {
  switch (key) {
    case 'maintenance_mode':
      return ShieldAlert
    case 'enable_registration':
      return UserPlus
    case 'enable_course_creation':
      return BookOpen
    case 'enable_reviews':
      return Star
    case 'enable_certificates':
      return Award
    case 'enable_leaderboard':
      return Trophy
    case 'enable_tts':
      return Volume2
    case 'enable_flashcards':
      return Layers
    case 'enable_demo_features':
      return Zap
    default:
      return SlidersHorizontal
  }
}

function getCategoryBadge(cat: string) {
  switch (cat) {
    case 'system':
      return { label: 'Sistem & Akses', class: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30' }
    case 'learning':
      return { label: 'Pembelajaran', class: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' }
    case 'interaction':
      return { label: 'Interaksi', class: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' }
    case 'gamification':
      return { label: 'Gamifikasi', class: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30' }
    default:
      return { label: 'Umum', class: 'bg-muted text-muted-foreground' }
  }
}

// Intercept toggle
function handleToggleClick(flag: FeatureFlagItem, nextState: boolean) {
  // Check if critical warning is needed:
  // 1. Turning OFF registration
  // 2. Turning ON maintenance mode
  if (
    (flag.key === 'enable_registration' && !nextState) ||
    (flag.key === 'maintenance_mode' && nextState)
  ) {
    pendingFlag.value = flag
    pendingTargetState.value = nextState
    isCriticalDialogOpen.value = true
    return
  }

  // Otherwise, apply directly
  executeFlagUpdate(flag, nextState)
}

async function confirmCriticalAction() {
  if (!pendingFlag.value) return
  await executeFlagUpdate(pendingFlag.value, pendingTargetState.value)
  isCriticalDialogOpen.value = false
  pendingFlag.value = null
}

async function executeFlagUpdate(flag: FeatureFlagItem, targetState: boolean) {
  isUpdating.value = true
  const previousState = flag.enabled

  // Optimistic update
  flag.enabled = targetState
  setLocalFlag(flag.key, targetState)

  try {
    const res = await api.admin.updateFeatureFlag(flag.key, targetState)
    successMessage.value = res.message
    setTimeout(() => {
      successMessage.value = null
    }, 4000)
    await fetchFlags()
  } catch (err: any) {
    // Rollback
    flag.enabled = previousState
    setLocalFlag(flag.key, previousState)
    errorMessage.value = err.message || 'Gagal memperbarui status feature flag.'
    setTimeout(() => {
      errorMessage.value = null
    }, 4000)
  } finally {
    isUpdating.value = false
  }
}

async function handleResetToDefault() {
  isResetting.value = true
  try {
    const res = await api.admin.resetFeatureFlags()
    successMessage.value = res.message
    isResetDialogOpen.value = false
    await fetchFlags()
    setTimeout(() => {
      successMessage.value = null
    }, 4000)
  } catch (err: any) {
    errorMessage.value = err.message || 'Gagal mereset feature flags.'
  } finally {
    isResetting.value = false
  }
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateStr
  }
}
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          Feature Flags & Sakelar Sistem
          <Badge variant="outline" class="font-mono text-[11px] bg-muted/60">
            {{ stats.total }} Flags
          </Badge>
        </h1>
        <p class="text-xs text-muted-foreground mt-0.5">
          Kontrol fungsionalitas dan ketersediaan modul platform secara real-time tanpa perlu deployment ulang kode.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          class="gap-1.5 text-xs h-8 bg-card cursor-pointer text-muted-foreground hover:text-foreground"
          @click="isResetDialogOpen = true"
        >
          <RotateCcw class="size-3.5" />
          <span>Reset ke Bawaan</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="gap-1.5 text-xs h-8 bg-card cursor-pointer"
          :disabled="isLoading"
          @click="fetchFlags"
        >
          <RefreshCw class="size-3.5" :class="{ 'animate-spin': isLoading }" />
          <span>Segarkan</span>
        </Button>
      </div>
    </div>

    <!-- Feedback Alerts -->
    <div
      v-if="successMessage"
      class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5 text-xs animate-in fade-in-50"
    >
      <CheckCircle2 class="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <span>{{ successMessage }}</span>
    </div>
    <div
      v-if="errorMessage"
      class="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive flex items-center gap-2.5 text-xs animate-in fade-in-50"
    >
      <AlertTriangle class="size-4 shrink-0" />
      <span>{{ errorMessage }}</span>
    </div>

    <!-- System Metrics Strip -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card class="border-border/80 bg-card shadow-xs">
        <CardContent class="p-3.5 flex items-center justify-between">
          <div>
            <div class="text-[11px] text-muted-foreground font-medium">Total Fitur Terdaftar</div>
            <div class="text-xl font-bold font-mono text-foreground mt-0.5">{{ stats.total }}</div>
          </div>
          <div class="size-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <SlidersHorizontal class="size-4" />
          </div>
        </CardContent>
      </Card>

      <Card class="border-border/80 bg-card shadow-xs">
        <CardContent class="p-3.5 flex items-center justify-between">
          <div>
            <div class="text-[11px] text-muted-foreground font-medium">Fitur Aktif</div>
            <div class="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">{{ stats.activeCount }}</div>
          </div>
          <div class="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 class="size-4" />
          </div>
        </CardContent>
      </Card>

      <Card class="border-border/80 bg-card shadow-xs">
        <CardContent class="p-3.5 flex items-center justify-between">
          <div>
            <div class="text-[11px] text-muted-foreground font-medium">Fitur Nonaktif</div>
            <div class="text-xl font-bold font-mono text-muted-foreground mt-0.5">{{ stats.inactiveCount }}</div>
          </div>
          <div class="size-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
            <Info class="size-4" />
          </div>
        </CardContent>
      </Card>

      <Card class="border-border/80 bg-card shadow-xs">
        <CardContent class="p-3.5 flex items-center justify-between">
          <div>
            <div class="text-[11px] text-muted-foreground font-medium">Mode Pemeliharaan</div>
            <div class="text-xs font-bold mt-1" :class="stats.isMaintenance ? 'text-destructive font-mono' : 'text-emerald-600 dark:text-emerald-400'">
              {{ stats.isMaintenance ? 'SEDANG AKTIF' : 'Operasional Normal' }}
            </div>
          </div>
          <div
            class="size-8 rounded-lg flex items-center justify-center"
            :class="stats.isMaintenance ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-600'"
          >
            <ShieldAlert class="size-4" />
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Search & Category Filters -->
    <Card class="border-border/80 bg-card shadow-xs">
      <CardContent class="p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div class="relative flex-1">
          <Search class="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="Cari nama fitur, key flag (cth: enable_reviews), atau deskripsi..."
            class="pl-9 h-9 text-xs bg-background"
          />
        </div>

        <div class="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60 text-xs overflow-x-auto">
          <button
            v-for="cat in categories"
            :key="cat.id"
            @click="selectedCategory = cat.id"
            class="px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer shrink-0"
            :class="selectedCategory === cat.id ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'"
          >
            {{ cat.label }}
          </button>
        </div>
      </CardContent>
    </Card>

    <!-- Flags Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card
        v-for="flag in filteredFlags"
        :key="flag.key"
        class="border-border/80 bg-card hover:border-indigo-500/40 transition-all shadow-xs flex flex-col justify-between overflow-hidden"
        :class="{
          'border-destructive/40 bg-destructive/5': flag.key === 'maintenance_mode' && flag.enabled,
          'opacity-85': !flag.enabled && flag.key !== 'maintenance_mode'
        }"
      >
        <CardContent class="p-5 space-y-4">
          <!-- Top Row: Icon, Badges, Switch -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3 min-w-0">
              <div
                class="size-10 rounded-xl flex items-center justify-center shrink-0 border"
                :class="
                  flag.key === 'maintenance_mode' && flag.enabled
                    ? 'bg-destructive/15 text-destructive border-destructive/30'
                    : flag.enabled
                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                    : 'bg-muted text-muted-foreground border-border/60'
                "
              >
                <component :is="getFlagIcon(flag.key)" class="size-5" />
              </div>

              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" class="text-[10px] px-1.5 py-0 font-medium" :class="getCategoryBadge(flag.category).class">
                    {{ getCategoryBadge(flag.category).label }}
                  </Badge>
                  <Badge
                    v-if="flag.isCritical"
                    variant="outline"
                    class="text-[9px] px-1.5 py-0 font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1"
                  >
                    <AlertTriangle class="size-2.5" />
                    Kritis
                  </Badge>
                </div>

                <h3 class="font-bold text-sm text-foreground mt-1 tracking-tight truncate">
                  {{ flag.name }}
                </h3>
                <div class="font-mono text-[10px] text-muted-foreground truncate mt-0.5">
                  key: <span class="text-indigo-600 dark:text-indigo-400 font-medium">{{ flag.key }}</span>
                </div>
              </div>
            </div>

            <!-- Switch Control -->
            <div class="flex flex-col items-end gap-1 shrink-0 pt-0.5">
              <Switch
                :checked="flag.enabled"
                :disabled="isUpdating"
                @update:checked="handleToggleClick(flag, $event)"
              />
              <span
                class="text-[10px] font-mono font-semibold"
                :class="
                  flag.key === 'maintenance_mode'
                    ? (flag.enabled ? 'text-destructive font-bold' : 'text-emerald-600')
                    : (flag.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')
                "
              >
                {{ flag.enabled ? (flag.key === 'maintenance_mode' ? 'AKTIF (ON)' : 'AKTIF') : 'NONAKTIF' }}
              </span>
            </div>
          </div>

          <!-- Description -->
          <p class="text-xs text-muted-foreground leading-relaxed">
            {{ flag.description }}
          </p>

          <!-- Audit Metadata Footer -->
          <div class="pt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
            <div class="flex items-center gap-1.5 truncate">
              <UserCheck class="size-3 text-muted-foreground shrink-0" />
              <span class="truncate">{{ flag.updatedBy || 'System' }}</span>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <Clock class="size-3 text-muted-foreground shrink-0" />
              <span>{{ formatDate(flag.updatedAt) }}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Empty State -->
    <div v-if="filteredFlags.length === 0" class="py-12 text-center text-muted-foreground text-xs">
      Tidak ada feature flag yang cocok dengan kriteria pencarian.
    </div>

    <!-- Dialog Konfirmasi Khusus Flag Kritis -->
    <Dialog :open="isCriticalDialogOpen" @update:open="isCriticalDialogOpen = $event">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <div class="flex items-center gap-2.5">
            <div class="size-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
              <AlertTriangle class="size-5" />
            </div>
            <DialogTitle class="text-base font-bold">
              Konfirmasi Perubahan Fitur Kritis
            </DialogTitle>
          </div>
          <DialogDescription class="text-xs pt-2 leading-relaxed">
            <template v-if="pendingFlag?.key === 'maintenance_mode' && pendingTargetState">
              Anda akan mengaktifkan <span class="font-bold text-destructive">Mode Pemeliharaan (Maintenance Mode)</span>.
              <span class="block mt-2 text-foreground">
                Seluruh pengguna umum dan siswa akan dialihkan ke layar informasi pemeliharaan dan tidak dapat mengerjakan kuis. Hanya akun Administrator yang tetap diizinkan mengakses platform.
              </span>
            </template>
            <template v-else-if="pendingFlag?.key === 'enable_registration' && !pendingTargetState">
              Anda akan <span class="font-bold text-destructive">menonaktifkan Pendaftaran Akun Baru</span>.
              <span class="block mt-2 text-foreground">
                Pengunjung tidak akan dapat mendaftar akun baru hingga sakelar ini diaktifkan kembali. Pengguna lama tetap dapat login seperti biasa.
              </span>
            </template>
            <template v-else>
              Apakah Anda yakin ingin mengubah status sakelar fitur
              <span class="font-bold text-foreground">{{ pendingFlag?.name }}</span> menjadi
              <span class="font-bold" :class="pendingTargetState ? 'text-emerald-600' : 'text-destructive'">
                {{ pendingTargetState ? 'AKTIF' : 'NONAKTIF' }}
              </span>?
            </template>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter class="gap-2 sm:gap-0 pt-3">
          <Button
            variant="outline"
            size="sm"
            class="text-xs h-8 cursor-pointer"
            :disabled="isUpdating"
            @click="isCriticalDialogOpen = false"
          >
            Batal
          </Button>
          <Button
            size="sm"
            class="text-xs h-8 gap-1.5 cursor-pointer bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            :disabled="isUpdating"
            @click="confirmCriticalAction"
          >
            <RefreshCw v-if="isUpdating" class="size-3.5 animate-spin" />
            <span>Ya, Lanjutkan Perubahan</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Dialog Konfirmasi Reset ke Bawaan -->
    <Dialog :open="isResetDialogOpen" @update:open="isResetDialogOpen = $event">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <div class="flex items-center gap-2.5">
            <div class="size-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <RotateCcw class="size-5" />
            </div>
            <DialogTitle class="text-base font-bold">
              Reset Seluruh Feature Flag ke Bawaan
            </DialogTitle>
          </div>
          <DialogDescription class="text-xs pt-2 leading-relaxed">
            Tindakan ini akan mengembalikan seluruh sakelar fitur ke konfigurasi awal platform:
            <ul class="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
              <li>Mode Pemeliharaan dinonaktifkan (Normal Operational)</li>
              <li>Pendaftaran akun, pembuatan kursus, ulasan, sertifikat, leaderboard, dan audio TTS diaktifkan kembali.</li>
            </ul>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter class="gap-2 sm:gap-0 pt-3">
          <Button
            variant="outline"
            size="sm"
            class="text-xs h-8 cursor-pointer"
            :disabled="isResetting"
            @click="isResetDialogOpen = false"
          >
            Batal
          </Button>
          <Button
            size="sm"
            class="text-xs h-8 gap-1.5 cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white"
            :disabled="isResetting"
            @click="handleResetToDefault"
          >
            <RefreshCw v-if="isResetting" class="size-3.5 animate-spin" />
            <span>Ya, Reset Sekarang</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
