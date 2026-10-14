<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '@/lib/api'
import { downloadBlob, showDownloadToast } from '@/lib/download'
import type { AdminQuizActivityItem } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Search,
  RefreshCw,
  Download,
  AlertTriangle
} from '@lucide/vue'

const activitiesList = ref<AdminQuizActivityItem[]>([])
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)

// Filters
const activitySearch = ref('')
const passFilter = ref<'ALL' | 'PASSED' | 'FAILED'>('ALL')

async function fetchActivities() {
  isLoading.value = true
  errorMessage.value = null
  try {
    const data = await api.admin.getQuizActivity()
    activitiesList.value = data
  } catch (err: any) {
    errorMessage.value = err.message || 'Gagal memuat log aktivitas kuis.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchActivities()
})

const filteredActivities = computed(() => {
  let list = activitiesList.value
  if (passFilter.value === 'PASSED') {
    list = list.filter(a => a.accuracy >= 80)
  } else if (passFilter.value === 'FAILED') {
    list = list.filter(a => a.accuracy < 80)
  }

  if (activitySearch.value.trim()) {
    const q = activitySearch.value.toLowerCase().trim()
    list = list.filter(a =>
      a.userName.toLowerCase().includes(q) ||
      a.userEmail.toLowerCase().includes(q) ||
      a.quizTitle.toLowerCase().includes(q)
    )
  }
  return list
})

// --- CSV EXPORT ---
async function exportActivitiesToCSV() {
  if (filteredActivities.value.length === 0) {
    showDownloadToast('Tidak ada data aktivitas kuis untuk diekspor.', undefined, 'info')
    return
  }

  const headers = [
    'ID Sesi',
    'Nama Murid',
    'Email Murid',
    'Modul Kursus',
    'Akurasi (%)',
    'Jawaban Benar',
    'Total Soal',
    'XP Diperoleh',
    'Durasi (Detik)',
    'Waktu Selesai'
  ]

  const rows = filteredActivities.value.map(a => [
    `"${a.id}"`,
    `"${(a.userName || '').replace(/"/g, '""')}"`,
    `"${(a.userEmail || '').replace(/"/g, '""')}"`,
    `"${(a.quizTitle || '').replace(/"/g, '""')}"`,
    a.accuracy,
    a.correctCount,
    a.totalQuestions,
    a.xpEarned,
    a.timeSpentSeconds || 0,
    `"${a.completedAt ? new Date(a.completedAt).toISOString() : ''}"`
  ])

  const csvString = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n')
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `aktivitas-kuis-${dateStr}.csv`

  await downloadBlob(blob, filename)
}

function formatDate(isoStr?: string): string {
  if (!isoStr) return '-'
  try {
    return new Date(isoStr).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return isoStr
  }
}
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          Log Aktivitas Kuis
          <Badge variant="outline" class="font-mono text-[11px] bg-muted/60">
            {{ filteredActivities.length }} Sesi
          </Badge>
        </h1>
        <p class="text-xs text-muted-foreground mt-0.5">
          Pemantauan real-time pengerjaan evaluasi materi oleh murid: akurasi jawaban, durasi pengerjaan, dan alokasi skor XP.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          class="gap-1.5 text-xs h-8 bg-card cursor-pointer"
          @click="exportActivitiesToCSV"
        >
          <Download class="size-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Ekspor CSV</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="gap-1.5 text-xs h-8 bg-card cursor-pointer"
          :disabled="isLoading"
          @click="fetchActivities"
        >
          <RefreshCw class="size-3.5" :class="{ 'animate-spin': isLoading }" />
          <span>Segarkan</span>
        </Button>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="errorMessage" class="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive flex items-center gap-2.5 text-xs animate-in fade-in-50">
      <AlertTriangle class="size-4 shrink-0" />
      <span>{{ errorMessage }}</span>
    </div>

    <!-- Search & Filter Controls -->
    <Card class="border-border/80 bg-card shadow-xs">
      <CardContent class="p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div class="relative flex-1">
          <Search class="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            v-model="activitySearch"
            placeholder="Cari nama murid, email, atau judul modul kursus..."
            class="pl-9 h-9 text-xs bg-background"
          />
        </div>

        <div class="flex items-center gap-2 overflow-x-auto">
          <!-- Status Kelulusan Filter -->
          <div class="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60 text-xs">
            <button
              v-for="f in [
                { key: 'ALL', label: 'Semua Sesi' },
                { key: 'PASSED', label: 'Lulus (>=80%)' },
                { key: 'FAILED', label: 'Remedial (<80%)' }
              ]"
              :key="f.key"
              @click="passFilter = f.key as any"
              class="px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
              :class="passFilter === f.key ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'"
            >
              {{ f.label }}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Activity Table -->
    <Card class="border-border/80 bg-card shadow-xs overflow-hidden">
      <CardContent class="p-0">
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left">
            <thead class="bg-muted/50 border-b border-border/80 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th class="py-3 px-4">Murid</th>
                <th class="py-3 px-4">Modul Kursus</th>
                <th class="py-3 px-4">Akurasi & Skor</th>
                <th class="py-3 px-4">Jawaban Benar</th>
                <th class="py-3 px-4">Perolehan XP</th>
                <th class="py-3 px-4 text-right">Waktu Penyelesaian</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border/60">
              <tr v-if="filteredActivities.length === 0">
                <td colspan="6" class="py-10 text-center text-muted-foreground">
                  Tidak ada aktivitas kuis yang cocok dengan kriteria filter.
                </td>
              </tr>
              <tr
                v-for="activity in filteredActivities"
                :key="activity.id"
                class="hover:bg-muted/30 transition-colors"
              >
                <!-- Murid Info -->
                <td class="py-3.5 px-4">
                  <div class="flex items-center gap-2.5">
                    <div class="size-7 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-[11px] shrink-0">
                      {{ (activity.userName || 'M').charAt(0).toUpperCase() }}
                    </div>
                    <div class="min-w-0">
                      <div class="font-semibold text-foreground truncate">{{ activity.userName }}</div>
                      <div class="text-[11px] text-muted-foreground font-mono truncate">{{ activity.userEmail }}</div>
                    </div>
                  </div>
                </td>

                <!-- Modul Kursus -->
                <td class="py-3.5 px-4 max-w-xs truncate">
                  <div class="font-medium text-foreground truncate">{{ activity.quizTitle }}</div>
                </td>

                <!-- Akurasi -->
                <td class="py-3.5 px-4">
                  <Badge
                    :variant="activity.accuracy >= 80 ? 'default' : 'secondary'"
                    class="font-mono text-[10px] gap-1"
                    :class="
                      activity.accuracy >= 80
                        ? 'bg-emerald-600 text-white'
                        : activity.accuracy >= 60
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                        : 'bg-destructive/10 text-destructive border-destructive/20'
                    "
                  >
                    <span>{{ activity.accuracy }}%</span>
                    <span v-if="activity.accuracy >= 80" class="text-[9px]">Lulus</span>
                  </Badge>
                </td>

                <!-- Jawaban Benar -->
                <td class="py-3.5 px-4 font-mono">
                  <span class="font-semibold text-foreground">{{ activity.correctCount }}</span>
                  <span class="text-muted-foreground"> / {{ activity.totalQuestions }} Soal</span>
                </td>

                <!-- Perolehan XP -->
                <td class="py-3.5 px-4">
                  <span class="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                    +{{ activity.xpEarned }} XP
                  </span>
                </td>

                <!-- Waktu Penyelesaian -->
                <td class="py-3.5 px-4 text-right text-muted-foreground text-[11px] font-mono">
                  {{ formatDate(activity.completedAt) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
