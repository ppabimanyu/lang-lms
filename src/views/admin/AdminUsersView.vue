<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '@/lib/api'
import { currentUser } from '@/lib/storage'
import { downloadBlob, showDownloadToast } from '@/lib/download'
import type { AdminUserItem } from '@/types'
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
  Search,
  RefreshCw,
  Download,
  UserCheck,
  UserX,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from '@lucide/vue'

const usersList = ref<AdminUserItem[]>([])
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

// Filters
const userSearch = ref('')
const userRoleFilter = ref('ALL')
const userStatusFilter = ref('ALL')

// Dialog States
const isUserStatusDialogOpen = ref(false)
const selectedUserForStatus = ref<AdminUserItem | null>(null)
const targetUserStatus = ref<'active' | 'inactive'>('inactive')
const isUserStatusActionLoading = ref(false)

const isRoleDialogOpen = ref(false)
const selectedUserForRole = ref<AdminUserItem | null>(null)
const targetUserRole = ref<'student' | 'partner' | 'curriculum' | 'admin'>('student')
const isRoleActionLoading = ref(false)

async function fetchUsers() {
  isLoading.value = true
  errorMessage.value = null
  try {
    const data = await api.admin.getUsers()
    usersList.value = data
  } catch (err: any) {
    errorMessage.value = err.message || 'Gagal memuat daftar pengguna.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchUsers()
})

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
    await fetchUsers()
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
    await fetchUsers()
    setTimeout(() => { successMessage.value = null }, 4000)
  } catch (err: any) {
    errorMessage.value = err.message || 'Gagal mengubah role pengguna.'
  } finally {
    isRoleActionLoading.value = false
  }
}

// --- CSV EXPORT ---
async function exportUsersToCSV() {
  if (filteredUsers.value.length === 0) {
    showDownloadToast('Tidak ada data pengguna untuk diekspor.', undefined, 'info')
    return
  }

  const headers = ['ID', 'Nama', 'Email', 'Role', 'Status', 'Total Kursus Dibuat', 'Tanggal Bergabung']
  const rows = filteredUsers.value.map(u => [
    `"${u.id}"`,
    `"${(u.name || '').replace(/"/g, '""')}"`,
    `"${(u.email || '').replace(/"/g, '""')}"`,
    `"${u.role}"`,
    `"${u.status || 'active'}"`,
    u.coursesCount || 0,
    `"${u.createdAt ? new Date(u.createdAt).toISOString() : ''}"`
  ])

  const csvString = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n')
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `pengguna-lingua-${dateStr}.csv`

  await downloadBlob(blob, filename)
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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
          Manajemen Pengguna
          <Badge variant="outline" class="font-mono text-[11px] bg-muted/60">
            {{ filteredUsers.length }} User
          </Badge>
        </h1>
        <p class="text-xs text-muted-foreground mt-0.5">
          Kelola hak akses role, aktivasi/deaktivasi akun untuk pemblokiran akses login, serta audit kepemilikan kursus.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          class="gap-1.5 text-xs h-8 bg-card cursor-pointer"
          @click="exportUsersToCSV"
        >
          <Download class="size-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Ekspor CSV</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="gap-1.5 text-xs h-8 bg-card cursor-pointer"
          :disabled="isLoading"
          @click="fetchUsers"
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

    <!-- Search & Filter Controls -->
    <Card class="border-border/80 bg-card shadow-xs">
      <CardContent class="p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div class="relative flex-1">
          <Search class="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            v-model="userSearch"
            placeholder="Cari berdasarkan nama atau email pengguna..."
            class="pl-9 h-9 text-xs bg-background"
          />
        </div>

        <div class="flex items-center gap-2 overflow-x-auto">
          <!-- Role Filter -->
          <div class="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60 text-xs">
            <button
              v-for="r in ['ALL', 'student', 'partner', 'curriculum', 'admin']"
              :key="r"
              @click="userRoleFilter = r"
              class="px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
              :class="userRoleFilter === r ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'"
            >
              {{ r === 'ALL' ? 'Semua Role' : r === 'student' ? 'Siswa' : r === 'partner' ? 'Partner' : r === 'curriculum' ? 'Kurikulum' : 'Admin' }}
            </button>
          </div>

          <!-- Status Filter -->
          <div class="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60 text-xs">
            <button
              v-for="s in ['ALL', 'active', 'inactive']"
              :key="s"
              @click="userStatusFilter = s"
              class="px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
              :class="userStatusFilter === s ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'"
            >
              {{ s === 'ALL' ? 'Semua Status' : s === 'active' ? 'Aktif' : 'Nonaktif' }}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Users Table -->
    <Card class="border-border/80 bg-card shadow-xs overflow-hidden">
      <CardContent class="p-0">
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left">
            <thead class="bg-muted/50 border-b border-border/80 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th class="py-3 px-4">Pengguna</th>
                <th class="py-3 px-4">Role</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4">Kursus Dibuat</th>
                <th class="py-3 px-4">Bergabung</th>
                <th class="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border/60">
              <tr v-if="filteredUsers.length === 0">
                <td colspan="6" class="py-10 text-center text-muted-foreground">
                  Tidak ada pengguna yang cocok dengan kriteria pencarian.
                </td>
              </tr>
              <tr
                v-for="user in filteredUsers"
                :key="user.id"
                class="hover:bg-muted/30 transition-colors"
                :class="{ 'opacity-65 bg-muted/15': user.status === 'inactive' }"
              >
                <!-- Pengguna Info -->
                <td class="py-3.5 px-4">
                  <div class="flex items-center gap-3">
                    <div class="size-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                      {{ (user.name || 'U').charAt(0).toUpperCase() }}
                    </div>
                    <div class="min-w-0">
                      <div class="font-semibold text-foreground flex items-center gap-1.5 truncate">
                        <span>{{ user.name }}</span>
                        <Badge v-if="user.id === currentUser?.id" variant="outline" class="text-[9px] px-1 py-0 border-primary text-primary">
                          Anda
                        </Badge>
                      </div>
                      <div class="text-[11px] text-muted-foreground font-mono truncate">{{ user.email }}</div>
                    </div>
                  </div>
                </td>

                <!-- Role -->
                <td class="py-3.5 px-4">
                  <Badge
                    :variant="user.role === 'admin' ? 'default' : user.role === 'curriculum' ? 'secondary' : 'outline'"
                    class="capitalize font-mono text-[10px]"
                    :class="user.role === 'admin'
                      ? 'bg-indigo-600 text-white'
                      : user.role === 'curriculum'
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                      : user.role === 'partner'
                      ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 font-medium'
                      : ''"
                  >
                    <ShieldCheck v-if="user.role === 'partner'" class="size-3 mr-1 inline-block text-blue-600 dark:text-blue-400" />
                    {{ user.role === 'admin' ? 'Super Admin' : user.role === 'curriculum' ? 'Tim Kurikulum' : user.role === 'partner' ? 'Verified Partner' : 'Siswa' }}
                  </Badge>
                </td>

                <!-- Status -->
                <td class="py-3.5 px-4">
                  <Badge
                    :variant="user.status === 'inactive' ? 'destructive' : 'outline'"
                    class="text-[10px] gap-1"
                    :class="user.status !== 'inactive' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' : ''"
                  >
                    <span class="size-1.5 rounded-full" :class="user.status === 'inactive' ? 'bg-destructive' : 'bg-emerald-500'"></span>
                    <span>{{ user.status === 'inactive' ? 'Nonaktif' : 'Aktif' }}</span>
                  </Badge>
                </td>

                <!-- Kursus Dibuat -->
                <td class="py-3.5 px-4">
                  <span class="font-mono font-medium">{{ user.coursesCount || 0 }}</span>
                  <span class="text-muted-foreground text-[10px] ml-1">modul</span>
                </td>

                <!-- Tanggal Bergabung -->
                <td class="py-3.5 px-4 text-muted-foreground text-[11px] font-mono">
                  {{ formatDate(user.createdAt) }}
                </td>

                <!-- Aksi -->
                <td class="py-3.5 px-4 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <!-- Ubah Role -->
                    <Button
                      variant="ghost"
                      size="sm"
                      class="h-7 px-2 text-xs gap-1 cursor-pointer"
                      :disabled="user.id === currentUser?.id"
                      @click="promptChangeRole(user)"
                      title="Ubah Role Pengguna"
                    >
                      <Shield class="size-3 text-muted-foreground" />
                      <span class="hidden sm:inline">Role</span>
                    </Button>

                    <!-- Toggle Status (Aktif / Nonaktif) -->
                    <Button
                      :variant="user.status === 'inactive' ? 'outline' : 'ghost'"
                      size="sm"
                      class="h-7 px-2 text-xs gap-1 cursor-pointer"
                      :class="user.status === 'inactive' ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-destructive hover:bg-destructive/10'"
                      :disabled="user.id === currentUser?.id"
                      @click="promptUserStatusToggle(user)"
                      :title="user.status === 'inactive' ? 'Aktifkan Akun' : 'Nonaktifkan Akun'"
                    >
                      <component :is="user.status === 'inactive' ? UserCheck : UserX" class="size-3.5" />
                      <span>{{ user.status === 'inactive' ? 'Aktifkan' : 'Nonaktifkan' }}</span>
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>

    <!-- Dialog: Konfirmasi Aktivasi / Deaktivasi Pengguna -->
    <Dialog :open="isUserStatusDialogOpen" @update:open="isUserStatusDialogOpen = $event">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <div class="flex items-center gap-2">
            <div
              class="size-8 rounded-lg flex items-center justify-center shrink-0"
              :class="targetUserStatus === 'inactive' ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-600'"
            >
              <component :is="targetUserStatus === 'inactive' ? UserX : UserCheck" class="size-4" />
            </div>
            <DialogTitle class="text-base">
              {{ targetUserStatus === 'inactive' ? 'Nonaktifkan Akun Pengguna' : 'Aktifkan Kembali Pengguna' }}
            </DialogTitle>
          </div>
          <DialogDescription class="text-xs pt-1.5 leading-relaxed">
            Apakah Anda yakin ingin {{ targetUserStatus === 'inactive' ? 'menonaktifkan' : 'mengaktifkan kembali' }} akun
            <span class="font-semibold text-foreground">{{ selectedUserForStatus?.name }}</span>
            ({{ selectedUserForStatus?.email }})?
            <span v-if="targetUserStatus === 'inactive'" class="block mt-2 text-destructive font-medium">
              Pengguna yang dinonaktifkan akan langsung diblokir saat login dan tidak bisa mengakses materi platform.
            </span>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter class="gap-2 sm:gap-0 pt-2">
          <Button
            variant="outline"
            size="sm"
            class="text-xs h-8 cursor-pointer"
            :disabled="isUserStatusActionLoading"
            @click="isUserStatusDialogOpen = false"
          >
            Batal
          </Button>
          <Button
            :variant="targetUserStatus === 'inactive' ? 'destructive' : 'default'"
            size="sm"
            class="text-xs h-8 gap-1.5 cursor-pointer"
            :class="targetUserStatus !== 'inactive' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''"
            :disabled="isUserStatusActionLoading"
            @click="confirmUserStatusToggle"
          >
            <RefreshCw v-if="isUserStatusActionLoading" class="size-3.5 animate-spin" />
            <span>{{ targetUserStatus === 'inactive' ? 'Ya, Nonaktifkan Akun' : 'Ya, Aktifkan Akun' }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Dialog: Ubah Role Pengguna -->
    <Dialog :open="isRoleDialogOpen" @update:open="isRoleDialogOpen = $event">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <div class="flex items-center gap-2">
            <div class="size-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Shield class="size-4" />
            </div>
            <DialogTitle class="text-base">Ubah Role Pengguna</DialogTitle>
          </div>
          <DialogDescription class="text-xs pt-1.5">
            Pilih tingkat hak akses untuk akun <span class="font-semibold text-foreground">{{ selectedUserForRole?.name }}</span>.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-2 py-2">
          <div
            v-for="roleOption in [
              { key: 'student', title: 'Siswa / Pelajar (Student)', desc: 'Dapat mempelajari kursus, mengikuti kuis, mengumpulkan XP dan sertifikat.' },
              { key: 'partner', title: 'Verified Partner (Mitra Terverifikasi)', desc: 'Institusi atau kreator mitra terverifikasi dengan lencana resmi di setiap kursus & profil.' },
              { key: 'curriculum', title: 'Tim Kurikulum (Curriculum)', desc: 'Dapat membuat modul baru, mengimpor bank soal, dan menerbitkan kursus resmi.' },
              { key: 'admin', title: 'Administrator (Super Admin)', desc: 'Akses penuh ke dashboard monitoring, audit modul kursus, dan manajemen pengguna.' }
            ]"
            :key="roleOption.key"
            @click="targetUserRole = roleOption.key as any"
            class="p-3 rounded-xl border text-xs cursor-pointer transition-colors"
            :class="targetUserRole === roleOption.key ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20' : 'border-border/80 hover:bg-muted/40'"
          >
            <div class="flex items-center justify-between">
              <span class="font-semibold text-foreground">{{ roleOption.title }}</span>
              <span v-if="targetUserRole === roleOption.key" class="size-2 rounded-full bg-indigo-600"></span>
            </div>
            <p class="text-[11px] text-muted-foreground mt-1">{{ roleOption.desc }}</p>
          </div>
        </div>

        <DialogFooter class="gap-2 sm:gap-0 pt-2">
          <Button
            variant="outline"
            size="sm"
            class="text-xs h-8 cursor-pointer"
            :disabled="isRoleActionLoading"
            @click="isRoleDialogOpen = false"
          >
            Batal
          </Button>
          <Button
            size="sm"
            class="text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
            :disabled="isRoleActionLoading"
            @click="confirmUserRoleChange"
          >
            <RefreshCw v-if="isRoleActionLoading" class="size-3.5 animate-spin" />
            <span>Simpan Perubahan Role</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
