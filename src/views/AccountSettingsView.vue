<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  currentUser,
  stats,
  myCourses,
  updateUserProfile,
  updateUserPassword,
  resetUserProgress,
  deleteUserAccount,
  logoutUser,
  openUserProfile
} from '@/lib/storage'
import {
  globalTargetLanguage,
  speechRate,
  SUPPORTED_LANGUAGES,
  findLanguageInfo,
  speak,
  isSpeaking
} from '@/lib/tts'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import AuthDialog from '@/components/auth/AuthDialog.vue'
import {
  User,
  ShieldCheck,
  Sliders,
  BarChart3,
  AlertTriangle,
  Mail,
  KeyRound,
  CheckCircle2,
  Volume2,
  Sun,
  Moon,
  Flame,
  Trophy,
  Target,
  LogOut,
  Trash2,
  RotateCcw,
  Sparkles,
  Eye,
  EyeOff,
  Copy,
  Check
} from '@lucide/vue'

// Active Settings Tab
const activeSettingsTab = ref('profile')

// Auth Dialog Modal for Guest Mode
const isAuthDialogOpen = ref(false)

// 1. Profile State
const profileName = ref('')
const profileEmail = ref('')
const isProfileSaving = ref(false)
const profileFeedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)
const isIdCopied = ref(false)

// Initialize profile inputs from currentUser
function syncProfileData() {
  if (currentUser.value) {
    profileName.value = currentUser.value.name
    profileEmail.value = currentUser.value.email
  }
}

watch(currentUser, () => {
  syncProfileData()
}, { immediate: true })

async function handleSaveProfile() {
  if (!profileName.value.trim() || !profileEmail.value.trim()) {
    profileFeedback.value = {
      type: 'error',
      message: 'Nama lengkap dan alamat email tidak boleh kosong.'
    }
    return
  }

  isProfileSaving.value = true
  profileFeedback.value = null

  try {
    const res = await updateUserProfile(profileName.value.trim(), profileEmail.value.trim())
    profileFeedback.value = {
      type: 'success',
      message: res.message || 'Profil berhasil diperbarui!'
    }
  } catch (err: any) {
    profileFeedback.value = {
      type: 'error',
      message: err.message || 'Gagal memperbarui profil.'
    }
  } finally {
    isProfileSaving.value = false
  }
}

function copyUserId() {
  if (!currentUser.value?.id) return
  navigator.clipboard.writeText(currentUser.value.id)
  isIdCopied.value = true
  setTimeout(() => {
    isIdCopied.value = false
  }, 2000)
}

// 2. Password State
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const isPasswordSaving = ref(false)
const passwordFeedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)

async function handleUpdatePassword() {
  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    passwordFeedback.value = {
      type: 'error',
      message: 'Semua kolom kata sandi wajib diisi.'
    }
    return
  }

  if (newPassword.value.length < 6) {
    passwordFeedback.value = {
      type: 'error',
      message: 'Kata sandi baru minimal harus 6 karakter.'
    }
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    passwordFeedback.value = {
      type: 'error',
      message: 'Konfirmasi kata sandi tidak cocok dengan kata sandi baru.'
    }
    return
  }

  isPasswordSaving.value = true
  passwordFeedback.value = null

  try {
    const res = await updateUserPassword(currentPassword.value, newPassword.value)
    passwordFeedback.value = {
      type: 'success',
      message: res.message || 'Kata sandi berhasil diperbarui!'
    }
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (err: any) {
    passwordFeedback.value = {
      type: 'error',
      message: err.message || 'Gagal memperbarui kata sandi.'
    }
  } finally {
    isPasswordSaving.value = false
  }
}

// 3. Preferences & TTS / Theme State
const speechRateOptions = [
  { label: 'Sangat Lambat (0.7x)', value: 0.7 },
  { label: 'Lambat (0.85x)', value: 0.85 },
  { label: 'Normal (1.0x)', value: 1.0 },
  { label: 'Cepat (1.2x)', value: 1.2 }
]

import { isDarkMode, toggleTheme } from '@/lib/theme'

function testTTSVoice() {
  const info = findLanguageInfo(globalTargetLanguage.value)
  speak(info.samplePhrase, globalTargetLanguage.value)
}

// 4. Statistics Computed
const accuracyPercent = computed(() => {
  if (stats.questionsAnswered === 0) return 0
  return Math.round((stats.correctAnswers / stats.questionsAnswered) * 100)
})

const memberSinceFormatted = computed(() => {
  if (!currentUser.value?.createdAt) return 'Baru Saja'
  try {
    const d = new Date(currentUser.value.createdAt)
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  } catch {
    return 'Baru Saja'
  }
})

// 5. Danger Zone State
const isResetModalOpen = ref(false)
const isResetting = ref(false)
const resetFeedback = ref<string | null>(null)

async function confirmResetProgress() {
  isResetting.value = true
  try {
    await resetUserProgress()
    resetFeedback.value = 'Progres belajar Anda telah berhasil direset ke 0.'
    isResetModalOpen.value = false
  } catch (err: any) {
    alert(err.message || 'Gagal mereset progres.')
  } finally {
    isResetting.value = false
  }
}

const isDeleteModalOpen = ref(false)
const deleteConfirmationText = ref('')
const isDeleting = ref(false)

async function confirmDeleteAccount() {
  if (deleteConfirmationText.value !== 'HAPUS AKUN') {
    return
  }

  isDeleting.value = true
  try {
    await deleteUserAccount()
    isDeleteModalOpen.value = false
  } catch (err: any) {
    alert(err.message || 'Gagal menghapus akun.')
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="max-w-5xl mx-auto pb-16 space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <User class="size-6 text-primary" />
          <span>Pengaturan Akun & Profil</span>
        </h1>
        <p class="text-xs text-muted-foreground mt-0.5">
          Kelola informasi profil, keamanan kata sandi, preferensi audio TTS, dan progres belajar Anda.
        </p>
      </div>

      <div v-if="currentUser" class="flex items-center gap-2">
        <Badge variant="outline" class="gap-1.5 py-1 px-3 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs">
          <span class="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Akun Terverifikasi</span>
        </Badge>
        <Button
          variant="outline"
          size="sm"
          class="gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
          @click="logoutUser"
        >
          <LogOut class="size-3.5" />
          <span>Keluar</span>
        </Button>
      </div>
    </div>

    <!-- Guest / Unauthenticated State -->
    <div v-if="!currentUser" class="p-8 sm:p-12 text-center rounded-2xl border border-dashed border-border/80 bg-card/60 backdrop-blur-xs space-y-6">
      <div class="size-16 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto shadow-sm">
        <ShieldCheck class="size-8" />
      </div>

      <div class="max-w-md mx-auto space-y-2">
        <h2 class="text-xl font-bold tracking-tight text-foreground">Masuk untuk Mengakses Pengaturan</h2>
        <p class="text-sm text-muted-foreground leading-relaxed">
          Anda saat ini menggunakan Lingua LMS sebagai tamu. Masuk atau daftarkan akun gratis untuk mengelola data profil, keamanan kata sandi, dan menyimpan progres belajar di awan (cloud).
        </p>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button size="lg" class="gap-2 font-medium" @click="isAuthDialogOpen = true">
          <Sparkles class="size-4" />
          <span>Masuk / Daftar Akun</span>
        </Button>
      </div>
    </div>

    <!-- Authenticated Settings Tabs -->
    <Tabs v-else v-model="activeSettingsTab" class="w-full space-y-6">
      <!-- Tabs Navigation Strip -->
      <TabsList class="w-full bg-muted/60 p-1 rounded-xl border border-border/60">
        <TabsTrigger value="profile" class="gap-2 text-xs data-[state=active]:bg-background data-[state=active]:shadow-2xs">
          <User class="size-3.5" />
          <span>Profil</span>
        </TabsTrigger>
        <TabsTrigger value="security" class="gap-2 text-xs data-[state=active]:bg-background data-[state=active]:shadow-2xs">
          <ShieldCheck class="size-3.5" />
          <span>Keamanan</span>
        </TabsTrigger>
        <TabsTrigger value="preferences" class="gap-2 text-xs data-[state=active]:bg-background data-[state=active]:shadow-2xs">
          <Sliders class="size-3.5" />
          <span>Preferensi</span>
        </TabsTrigger>
        <TabsTrigger value="stats" class="gap-2 text-xs data-[state=active]:bg-background data-[state=active]:shadow-2xs">
          <BarChart3 class="size-3.5" />
          <span>Statistik</span>
        </TabsTrigger>
        <TabsTrigger value="danger" class="gap-2 text-xs data-[state=active]:bg-background data-[state=active]:shadow-2xs text-destructive data-[state=active]:text-destructive">
          <AlertTriangle class="size-3.5" />
          <span>Zona Bahaya</span>
        </TabsTrigger>
      </TabsList>

      <!-- TAB 1: PROFIL & IDENTITAS -->
      <TabsContent value="profile" class="space-y-6">
        <Card class="border-border/80 bg-card">
          <CardHeader>
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <div
                  class="size-10 rounded-xl flex items-center justify-center font-bold text-base border"
                  :class="currentUser.role === 'curriculum'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : currentUser.role === 'partner'
                    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                    : 'bg-primary/10 text-primary border-primary/20'"
                >
                  <ShieldCheck v-if="currentUser.role === 'curriculum' || currentUser.role === 'partner'" class="size-5" />
                  <span v-else>{{ currentUser.name.charAt(0).toUpperCase() }}</span>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <CardTitle class="text-base font-semibold">Identitas Pengguna</CardTitle>
                    <Badge
                      v-if="currentUser.role === 'curriculum'"
                      variant="outline"
                      class="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[10px] py-0 px-2"
                    >
                      <ShieldCheck class="size-3" />
                      <span>Tim Kurikulum Resmi</span>
                    </Badge>
                    <Badge
                      v-else-if="currentUser.role === 'partner'"
                      variant="outline"
                      class="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 gap-1 text-[10px] py-0 px-2 font-medium"
                    >
                      <ShieldCheck class="size-3 text-blue-600 dark:text-blue-400" />
                      <span>Verified Partner</span>
                    </Badge>
                  </div>
                  <CardDescription class="text-xs">Ubah nama tampilan dan alamat email akun Anda</CardDescription>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                class="text-xs gap-1.5 self-start sm:self-auto shrink-0"
                @click="openUserProfile(currentUser.id)"
              >
                <User class="size-3.5" />
                <span>Lihat Profil Publik Saya</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent class="space-y-5">
            <!-- Feedback Alert -->
            <Alert
              v-if="profileFeedback"
              :variant="profileFeedback.type === 'error' ? 'destructive' : 'default'"
              :class="profileFeedback.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : ''"
            >
              <CheckCircle2 v-if="profileFeedback.type === 'success'" class="size-4" />
              <AlertTriangle v-else class="size-4" />
              <AlertTitle class="text-xs font-semibold">
                {{ profileFeedback.type === 'success' ? 'Berhasil' : 'Perhatian' }}
              </AlertTitle>
              <AlertDescription class="text-xs">
                {{ profileFeedback.message }}
              </AlertDescription>
            </Alert>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Name Input -->
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-foreground">Nama Lengkap *</label>
                <div class="relative">
                  <User class="size-4 text-muted-foreground absolute left-3 top-2.5" />
                  <Input
                    v-model="profileName"
                    class="pl-9 text-xs"
                    placeholder="Nama lengkap Anda..."
                  />
                </div>
              </div>

              <!-- Email Input -->
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-foreground">Alamat Email *</label>
                <div class="relative">
                  <Mail class="size-4 text-muted-foreground absolute left-3 top-2.5" />
                  <Input
                    v-model="profileEmail"
                    type="email"
                    class="pl-9 text-xs"
                    placeholder="nama@email.com"
                  />
                </div>
              </div>
            </div>

            <!-- Readonly Metadata -->
            <div class="p-3.5 rounded-xl bg-muted/40 border border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div class="flex flex-col gap-1">
                <span class="text-muted-foreground text-[11px]">User ID (UUID Database)</span>
                <div class="flex items-center gap-2">
                  <code class="font-mono text-[11px] truncate text-foreground">{{ currentUser.id }}</code>
                  <Button variant="ghost" size="icon" class="size-6 shrink-0" @click="copyUserId" title="Salin ID">
                    <Check v-if="isIdCopied" class="size-3 text-emerald-500" />
                    <Copy v-else class="size-3 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              <div class="flex flex-col gap-1">
                <span class="text-muted-foreground text-[11px]">Bergabung Sejak</span>
                <span class="font-medium text-foreground">{{ memberSinceFormatted }}</span>
              </div>
            </div>

            <div class="flex justify-end pt-2">
              <Button
                :disabled="isProfileSaving"
                class="gap-2 text-xs font-medium"
                @click="handleSaveProfile"
              >
                <CheckCircle2 class="size-3.5" />
                <span>{{ isProfileSaving ? 'Menyimpan...' : 'Simpan Perubahan Profil' }}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- TAB 2: KEAMANAN & KATA SANDI -->
      <TabsContent value="security" class="space-y-6">
        <Card class="border-border/80 bg-card">
          <CardHeader>
            <div class="flex items-center gap-3">
              <div class="size-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                <KeyRound class="size-5" />
              </div>
              <div>
                <CardTitle class="text-base font-semibold">Ubah Kata Sandi</CardTitle>
                <CardDescription class="text-xs">Pastikan kata sandi baru Anda aman dan sulit ditebak orang lain</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent class="space-y-5">
            <!-- Feedback Alert -->
            <Alert
              v-if="passwordFeedback"
              :variant="passwordFeedback.type === 'error' ? 'destructive' : 'default'"
              :class="passwordFeedback.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : ''"
            >
              <CheckCircle2 v-if="passwordFeedback.type === 'success'" class="size-4" />
              <AlertTriangle v-else class="size-4" />
              <AlertTitle class="text-xs font-semibold">
                {{ passwordFeedback.type === 'success' ? 'Berhasil' : 'Perhatian' }}
              </AlertTitle>
              <AlertDescription class="text-xs">
                {{ passwordFeedback.message }}
              </AlertDescription>
            </Alert>

            <div class="space-y-4 max-w-md">
              <!-- Current Password -->
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-foreground">Kata Sandi Saat Ini *</label>
                <div class="relative">
                  <Input
                    v-model="currentPassword"
                    :type="showCurrentPassword ? 'text' : 'password'"
                    class="pr-9 text-xs"
                    placeholder="Masukkan kata sandi lama Anda"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="absolute right-1 top-1 size-7 text-muted-foreground hover:text-foreground"
                    @click="showCurrentPassword = !showCurrentPassword"
                  >
                    <EyeOff v-if="showCurrentPassword" class="size-3.5" />
                    <Eye v-else class="size-3.5" />
                  </Button>
                </div>
              </div>

              <!-- New Password -->
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-foreground">Kata Sandi Baru *</label>
                <div class="relative">
                  <Input
                    v-model="newPassword"
                    :type="showNewPassword ? 'text' : 'password'"
                    class="pr-9 text-xs"
                    placeholder="Minimal 6 karakter"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="absolute right-1 top-1 size-7 text-muted-foreground hover:text-foreground"
                    @click="showNewPassword = !showNewPassword"
                  >
                    <EyeOff v-if="showNewPassword" class="size-3.5" />
                    <Eye v-else class="size-3.5" />
                  </Button>
                </div>
              </div>

              <!-- Confirm New Password -->
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-foreground">Konfirmasi Kata Sandi Baru *</label>
                <Input
                  v-model="confirmPassword"
                  type="password"
                  class="text-xs"
                  placeholder="Ulangi kata sandi baru"
                />
              </div>

              <div class="pt-2">
                <Button
                  :disabled="isPasswordSaving"
                  class="gap-2 text-xs font-medium"
                  @click="handleUpdatePassword"
                >
                  <KeyRound class="size-3.5" />
                  <span>{{ isPasswordSaving ? 'Menyimpan...' : 'Perbarui Kata Sandi' }}</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- TAB 3: PREFERENSI & SUARA / TEMA -->
      <TabsContent value="preferences" class="space-y-6">
        <!-- Target Language & Audio TTS -->
        <Card class="border-border/80 bg-card">
          <CardHeader>
            <div class="flex items-center gap-3">
              <div class="size-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                <Volume2 class="size-5" />
              </div>
              <div>
                <CardTitle class="text-base font-semibold">Audio & Artikulasi Suara (TTS)</CardTitle>
                <CardDescription class="text-xs">Atur bahasa default dan laju kecepatan pengucapan teks di latihan</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent class="space-y-6">
            <!-- Language Select -->
            <div class="space-y-2">
              <label class="text-xs font-medium text-foreground">Bahasa Target Default</label>
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                <button
                  v-for="lang in SUPPORTED_LANGUAGES"
                  :key="lang.code"
                  type="button"
                  @click="globalTargetLanguage = lang.code"
                  class="flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all"
                  :class="[
                    globalTargetLanguage === lang.code
                      ? 'border-primary bg-primary/10 text-foreground font-semibold shadow-2xs'
                      : 'border-border/60 hover:border-border hover:bg-muted/40 text-muted-foreground'
                  ]"
                >
                  <span class="text-xl">{{ lang.flag }}</span>
                  <div class="min-w-0">
                    <div class="text-xs truncate">{{ lang.name }}</div>
                    <div class="text-[10px] text-muted-foreground truncate">{{ lang.code }}</div>
                  </div>
                </button>
              </div>
            </div>

            <!-- Speech Rate -->
            <div class="space-y-2">
              <label class="text-xs font-medium text-foreground">Kecepatan Pengucapan (Speech Rate)</label>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  v-for="opt in speechRateOptions"
                  :key="opt.value"
                  type="button"
                  @click="speechRate = opt.value"
                  class="p-2.5 rounded-xl border text-center transition-all"
                  :class="[
                    Math.abs(speechRate - opt.value) < 0.05
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
                      : 'border-border/60 hover:bg-muted/40 text-muted-foreground text-xs'
                  ]"
                >
                  <div class="text-xs">{{ opt.label }}</div>
                </button>
              </div>
            </div>

            <!-- Preview TTS Button -->
            <div class="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between gap-4">
              <div class="space-y-0.5">
                <div class="text-xs font-medium text-foreground">Uji Coba Suara Artikulasi</div>
                <div class="text-[11px] text-muted-foreground">
                  "{{ findLanguageInfo(globalTargetLanguage).samplePhrase }}"
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                class="gap-1.5 text-xs shrink-0"
                :disabled="isSpeaking"
                @click="testTTSVoice"
              >
                <Volume2 class="size-3.5 text-primary" :class="{ 'animate-pulse': isSpeaking }" />
                <span>{{ isSpeaking ? 'Berbicara...' : 'Dengarkan' }}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <!-- Theme Preferences -->
        <Card class="border-border/80 bg-card">
          <CardHeader>
            <div class="flex items-center gap-3">
              <div class="size-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
                <Sun v-if="!isDarkMode" class="size-5" />
                <Moon v-else class="size-5" />
              </div>
              <div>
                <CardTitle class="text-base font-semibold">Tema Antarmuka</CardTitle>
                <CardDescription class="text-xs">Pilih tema terang atau gelap sesuai kenyamanan visual Anda</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div class="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-muted/30">
              <div class="space-y-0.5">
                <div class="text-xs font-semibold text-foreground">
                  Mode Saat Ini: {{ isDarkMode ? 'Mode Gelap (Dark)' : 'Mode Terang (Light)' }}
                </div>
                <div class="text-[11px] text-muted-foreground">
                  Beralih mode untuk meningkatkan kenyamanan saat belajar di ruangan redup
                </div>
              </div>

              <Button variant="outline" size="sm" class="gap-2 text-xs" @click="toggleTheme">
                <Sun v-if="isDarkMode" class="size-3.5 text-amber-400" />
                <Moon v-else class="size-3.5 text-slate-700" />
                <span>{{ isDarkMode ? 'Beralih ke Terang' : 'Beralih ke Gelap' }}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- TAB 4: STATISTIK & PROGRES BELAJAR -->
      <TabsContent value="stats" class="space-y-6">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <!-- Streak -->
          <Card class="border-border/80 bg-card p-4 flex items-center gap-3">
            <div class="size-11 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Flame class="size-6" />
            </div>
            <div>
              <div class="text-xl font-bold tracking-tight text-foreground">{{ stats.streak }} Hari</div>
              <div class="text-[11px] text-muted-foreground">Streak Berturut-turut</div>
            </div>
          </Card>

          <!-- XP -->
          <Card class="border-border/80 bg-card p-4 flex items-center gap-3">
            <div class="size-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Trophy class="size-6" />
            </div>
            <div>
              <div class="text-xl font-bold tracking-tight text-foreground">{{ stats.xp }} XP</div>
              <div class="text-[11px] text-muted-foreground">Total Skor Belajar</div>
            </div>
          </Card>

          <!-- Quizzes Taken -->
          <Card class="border-border/80 bg-card p-4 flex items-center gap-3">
            <div class="size-11 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Target class="size-6" />
            </div>
            <div>
              <div class="text-xl font-bold tracking-tight text-foreground">{{ stats.quizzesTaken }}</div>
              <div class="text-[11px] text-muted-foreground">Sesi Latihan Tuntas</div>
            </div>
          </Card>

          <!-- Accuracy -->
          <Card class="border-border/80 bg-card p-4 flex items-center gap-3">
            <div class="size-11 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <BarChart3 class="size-6" />
            </div>
            <div>
              <div class="text-xl font-bold tracking-tight text-foreground">{{ accuracyPercent }}%</div>
              <div class="text-[11px] text-muted-foreground">Akurasi Rata-rata</div>
            </div>
          </Card>
        </div>

        <!-- Detail Breakdown -->
        <Card class="border-border/80 bg-card">
          <CardHeader>
            <CardTitle class="text-base font-semibold">Rincian Pertanyaan & Kursus</CardTitle>
            <CardDescription class="text-xs">Data ringkasan interaksi dan aktivitas belajar akun Anda</CardDescription>
          </CardHeader>

          <CardContent class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-center">
                <div class="text-lg font-bold text-foreground">{{ stats.questionsAnswered }}</div>
                <div class="text-[11px] text-muted-foreground">Total Pertanyaan Dijawab</div>
              </div>
              <div class="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-center">
                <div class="text-lg font-bold text-emerald-600 dark:text-emerald-400">{{ stats.correctAnswers }}</div>
                <div class="text-[11px] text-muted-foreground">Jawaban Benar</div>
              </div>
              <div class="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-center">
                <div class="text-lg font-bold text-primary">{{ myCourses.length }}</div>
                <div class="text-[11px] text-muted-foreground">Kursus Kustom Saya</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- TAB 5: ZONA BAHAYA -->
      <TabsContent value="danger" class="space-y-6">
        <Card class="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <div class="flex items-center gap-3">
              <div class="size-10 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center border border-destructive/20">
                <AlertTriangle class="size-5" />
              </div>
              <div>
                <CardTitle class="text-base font-semibold text-destructive">Tindakan Kritis & Zona Bahaya</CardTitle>
                <CardDescription class="text-xs">Tindakan di bawah ini bersifat permanen dan tidak dapat dibatalkan</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent class="space-y-4">
            <!-- Alert Feedback if reset succeeded -->
            <Alert v-if="resetFeedback" class="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 class="size-4" />
              <AlertTitle class="text-xs font-semibold">Berhasil</AlertTitle>
              <AlertDescription class="text-xs">{{ resetFeedback }}</AlertDescription>
            </Alert>

            <!-- 1. Reset Progress Option -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/80 bg-background/80">
              <div class="space-y-1">
                <div class="text-xs font-semibold text-foreground flex items-center gap-2">
                  <RotateCcw class="size-3.5 text-amber-500" />
                  <span>Reset Progres Belajar Akun</span>
                </div>
                <p class="text-[11px] text-muted-foreground max-w-lg">
                  Mengatur ulang total XP, streak, dan riwayat kuis Anda kembali ke 0. Akun dan modul kursus Anda tidak akan terhapus.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                class="gap-1.5 text-xs text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 hover:border-amber-500/30 shrink-0"
                @click="isResetModalOpen = true"
              >
                <RotateCcw class="size-3.5" />
                <span>Reset Progres</span>
              </Button>
            </div>

            <!-- 2. Delete Account Option -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-destructive/30 bg-destructive/10">
              <div class="space-y-1">
                <div class="text-xs font-semibold text-destructive flex items-center gap-2">
                  <Trash2 class="size-3.5 text-destructive" />
                  <span>Hapus Akun Permanen</span>
                </div>
                <p class="text-[11px] text-muted-foreground max-w-lg">
                  Menghapus akun Anda dari basis data PostgreSQL beserta seluruh riwayat capaian dan data kursus yang Anda buat.
                </p>
              </div>

              <Button
                variant="destructive"
                size="sm"
                class="gap-1.5 text-xs shrink-0"
                @click="isDeleteModalOpen = true"
              >
                <Trash2 class="size-3.5" />
                <span>Hapus Akun</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    <!-- Dialog Konfirmasi Reset Progres -->
    <Dialog v-model:open="isResetModalOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="text-base font-semibold flex items-center gap-2">
            <AlertTriangle class="size-5 text-amber-500" />
            <span>Konfirmasi Reset Progres</span>
          </DialogTitle>
          <DialogDescription class="text-xs text-muted-foreground">
            Apakah Anda yakin ingin mereset seluruh progres belajar (XP, streak, dan sesi kuis) menjadi 0?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter class="gap-2 sm:gap-0 pt-2">
          <Button variant="outline" size="sm" class="text-xs" @click="isResetModalOpen = false">
            Batal
          </Button>
          <Button
            variant="destructive"
            size="sm"
            class="text-xs gap-1.5"
            :disabled="isResetting"
            @click="confirmResetProgress"
          >
            <RotateCcw class="size-3.5" />
            <span>{{ isResetting ? 'Mereset...' : 'Ya, Reset Sekarang' }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Dialog Konfirmasi Hapus Akun -->
    <Dialog v-model:open="isDeleteModalOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="text-base font-semibold text-destructive flex items-center gap-2">
            <Trash2 class="size-5 text-destructive" />
            <span>Hapus Akun Secara Permanen</span>
          </DialogTitle>
          <DialogDescription class="text-xs text-muted-foreground">
            Tindakan ini tidak dapat dibatalkan. Ketik teks <strong class="text-foreground font-mono">HAPUS AKUN</strong> di bawah untuk mengonfirmasi.
          </DialogDescription>
        </DialogHeader>

        <div class="py-2">
          <Input
            v-model="deleteConfirmationText"
            class="text-xs font-mono"
            placeholder="Ketik HAPUS AKUN"
          />
        </div>

        <DialogFooter class="gap-2 sm:gap-0 pt-2">
          <Button variant="outline" size="sm" class="text-xs" @click="isDeleteModalOpen = false">
            Batal
          </Button>
          <Button
            variant="destructive"
            size="sm"
            class="text-xs gap-1.5"
            :disabled="deleteConfirmationText !== 'HAPUS AKUN' || isDeleting"
            @click="confirmDeleteAccount"
          >
            <Trash2 class="size-3.5" />
            <span>{{ isDeleting ? 'Menghapus...' : 'Hapus Akun Saya' }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Dialog Auth jika dibuka dari tombol tamu -->
    <AuthDialog v-model:open="isAuthDialogOpen" />
  </div>
</template>
