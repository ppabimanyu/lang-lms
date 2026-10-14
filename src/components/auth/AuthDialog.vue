<script setup lang="ts">
import { ref } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { loginUser, registerUser } from '@/lib/storage'
import { isFeatureEnabled } from '@/lib/featureFlags'
import { User, Lock, Mail, Sparkles, CheckCircle2, AlertCircle, ShieldCheck, Shield } from '@lucide/vue'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const mode = ref<'login' | 'register'>('login')
const name = ref('')
const email = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

function switchMode(newMode: 'login' | 'register') {
  if (newMode === 'register' && !isFeatureEnabled('enable_registration')) {
    errorMessage.value = 'Pendaftaran akun baru sedang ditutup sementara oleh Administrator.'
    return
  }
  mode.value = newMode
  errorMessage.value = null
  successMessage.value = null
}

function fillDemoCredentials() {
  email.value = 'demo@lingua.com'
  password.value = 'password123'
  mode.value = 'login'
}

function fillCurriculumCredentials() {
  email.value = 'kurikulum@lingua.com'
  password.value = 'password123'
  mode.value = 'login'
}

function fillAdminCredentials() {
  email.value = 'admin@lingua.com'
  password.value = 'admin123'
  mode.value = 'login'
}

async function handleSubmit() {
  errorMessage.value = null
  successMessage.value = null
  isLoading.value = true

  try {
    if (mode.value === 'login') {
      await loginUser(email.value, password.value)
      successMessage.value = 'Berhasil masuk ke akun Anda!'
    } else {
      await registerUser(name.value, email.value, password.value)
      successMessage.value = 'Pendaftaran berhasil! Akun Anda siap digunakan.'
    }

    setTimeout(() => {
      emit('update:open', false)
      name.value = ''
      email.value = ''
      password.value = ''
      successMessage.value = null
    }, 1200)
  } catch (error: any) {
    errorMessage.value = error.message || 'Terjadi kesalahan. Silakan coba lagi.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(val: boolean) => emit('update:open', val)">
    <DialogContent class="sm:max-w-md p-6">
      <DialogHeader class="space-y-1.5 text-center">
        <div class="mx-auto size-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center border border-primary/20 shadow-xs mb-1">
          <User class="size-6" />
        </div>
        <DialogTitle class="text-xl font-bold">
          {{ mode === 'login' ? 'Masuk ke Akun Anda' : 'Daftar Akun Baru' }}
        </DialogTitle>
        <DialogDescription class="text-xs text-muted-foreground">
          Simpan progres belajar, streak harian, dan bank materi langsung ke database PostgreSQL.
        </DialogDescription>
      </DialogHeader>

      <!-- Feedback Alerts -->
      <div v-if="successMessage" class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
        <CheckCircle2 class="size-4 shrink-0 text-emerald-600" />
        <span>{{ successMessage }}</span>
      </div>

      <div v-if="errorMessage" class="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
        <AlertCircle class="size-4 shrink-0" />
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Form Inputs -->
      <form @submit.prevent="handleSubmit" class="space-y-3.5 py-1">
        <div v-if="mode === 'register'" class="space-y-1.5">
          <label class="text-xs font-semibold text-foreground">Nama Lengkap</label>
          <div class="relative">
            <User class="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              v-model="name"
              placeholder="Contoh: Budi Santoso"
              class="pl-9 text-xs h-9"
              required
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-foreground">Alamat Email</label>
          <div class="relative">
            <Mail class="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              v-model="email"
              type="email"
              placeholder="nama@email.com"
              class="pl-9 text-xs h-9"
              required
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-foreground">Kata Sandi</label>
          <div class="relative">
            <Lock class="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              v-model="password"
              type="password"
              placeholder="••••••••"
              class="pl-9 text-xs h-9"
              required
            />
          </div>
        </div>

        <Button type="submit" class="w-full text-xs h-9 gap-1.5 font-semibold mt-2" :disabled="isLoading">
          <Sparkles class="size-3.5" />
          <span>{{ isLoading ? 'Memproses...' : mode === 'login' ? 'Masuk Sekarang' : 'Buat Akun' }}</span>
        </Button>
      </form>

      <!-- Quick Demo Login Fill (toggled via feature flag) -->
      <div v-if="mode === 'login' && isFeatureEnabled('enable_demo_features')" class="p-3 rounded-xl bg-muted/60 border border-border/80 space-y-2 text-xs">
        <div class="font-semibold text-foreground text-[11px]">Pilihan Akun Cepat:</div>
        
        <div class="flex items-center justify-between gap-2 p-2 rounded-lg bg-background/80 border border-border/60">
          <div class="space-y-0.5">
            <div class="font-medium text-foreground text-[11px]">Pembelajar Demo</div>
            <div class="text-[10px] text-muted-foreground font-mono">demo@lingua.com • password123</div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="h-7 text-[11px] shrink-0"
            @click="fillDemoCredentials"
          >
            Pakai Demo
          </Button>
        </div>

        <div class="flex items-center justify-between gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25">
          <div class="space-y-0.5">
            <div class="font-medium text-emerald-700 dark:text-emerald-400 text-[11px] flex items-center gap-1.5">
              <span>Tim Kurikulum Lingua</span>
              <Badge variant="outline" class="text-[9px] px-1 py-0 h-4 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 gap-0.5">
                <ShieldCheck class="size-2.5" />
                <span>Resmi</span>
              </Badge>
            </div>
            <div class="text-[10px] text-muted-foreground font-mono">kurikulum@lingua.com • password123</div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="h-7 text-[11px] shrink-0 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium"
            @click="fillCurriculumCredentials"
          >
            Pakai Kurikulum
          </Button>
        </div>

        <div class="flex items-center justify-between gap-2 p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/25">
          <div class="space-y-0.5">
            <div class="font-medium text-indigo-700 dark:text-indigo-400 text-[11px] flex items-center gap-1.5">
              <span>Administrator Lingua</span>
              <Badge variant="outline" class="text-[9px] px-1 py-0 h-4 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 bg-indigo-500/15 gap-0.5">
                <Shield class="size-2.5" />
                <span>Super Admin</span>
              </Badge>
            </div>
            <div class="text-[10px] text-muted-foreground font-mono">admin@lingua.com • admin123</div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="h-7 text-[11px] shrink-0 border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium"
            @click="fillAdminCredentials"
          >
            Pakai Admin
          </Button>
        </div>
      </div>

      <!-- Footer Mode Toggle -->
      <div class="text-center text-xs text-muted-foreground pt-1 border-t border-border">
        <span v-if="mode === 'login'">
          <template v-if="isFeatureEnabled('enable_registration')">
            Belum punya akun?
            <button
              type="button"
              class="text-primary font-bold hover:underline ml-1 cursor-pointer"
              @click="switchMode('register')"
            >
              Daftar Sekarang
            </button>
          </template>
          <template v-else>
            <span class="text-muted-foreground text-[11px] italic">
              Pendaftaran akun baru sedang ditutup sementara oleh Administrator.
            </span>
          </template>
        </span>
        <span v-else>
          Sudah punya akun?
          <button
            type="button"
            class="text-primary font-bold hover:underline ml-1 cursor-pointer"
            @click="switchMode('login')"
          >
            Masuk ke Akun
          </button>
        </span>
      </div>
    </DialogContent>
  </Dialog>
</template>
