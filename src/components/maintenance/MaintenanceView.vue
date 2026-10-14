<script setup lang="ts">
import { ref } from 'vue'
import { fetchFeatureFlags } from '@/lib/featureFlags'
import { currentUser, logoutUser } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import AuthDialog from '@/components/auth/AuthDialog.vue'
import {
  ShieldAlert,
  RefreshCw,
  LogOut,
  Sparkles,
  Lock,
  ArrowRight
} from '@lucide/vue'

const isChecking = ref(false)
const isAuthDialogOpen = ref(false)

async function handleCheckStatus() {
  isChecking.value = true
  try {
    await fetchFeatureFlags()
  } finally {
    setTimeout(() => {
      isChecking.value = false
    }, 600)
  }
}
</script>

<template>
  <div class="min-h-screen w-full bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
    <!-- Background Ambient Glow -->
    <div class="absolute -top-32 -left-32 size-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-32 -right-32 size-96 rounded-full bg-purple-500/10 blur-3xl pointer-events-none"></div>

    <Card class="max-w-md w-full border-border/80 bg-card/90 backdrop-blur-md shadow-xl text-center relative z-10 animate-in fade-in zoom-in-95 duration-300">
      <CardContent class="p-8 space-y-6">
        <!-- Icon Banner -->
        <div class="mx-auto size-18 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-lg shadow-amber-500/10">
          <ShieldAlert class="size-9 animate-pulse" />
        </div>

        <div class="space-y-2">
          <Badge variant="outline" class="font-mono text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 px-2.5 py-0.5">
            Sistem Dalam Pemeliharaan
          </Badge>
          <h1 class="text-2xl font-bold tracking-tight text-foreground">
            Lingua LMS Sedang Ditingkatkan
          </h1>
          <p class="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Kami sedang melakukan pemeliharaan sistem terencana untuk memberikan stabilitas dan performa belajar yang lebih prima. Layanan akan segera beroperasi normal kembali.
          </p>
        </div>

        <!-- Info Card -->
        <div class="p-3.5 rounded-xl bg-muted/50 border border-border/60 text-xs text-muted-foreground flex items-center justify-between font-mono">
          <span class="flex items-center gap-1.5">
            <Sparkles class="size-3.5 text-primary" />
            <span>Status Layanan</span>
          </span>
          <span class="text-amber-600 dark:text-amber-400 font-semibold">Maintenance Mode ON</span>
        </div>

        <!-- Actions -->
        <div class="space-y-2.5 pt-2">
          <Button
            class="w-full gap-2 cursor-pointer h-9 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            :disabled="isChecking"
            @click="handleCheckStatus"
          >
            <RefreshCw class="size-3.5" :class="{ 'animate-spin': isChecking }" />
            <span>Periksa Status & Segarkan</span>
          </Button>

          <Button
            v-if="currentUser"
            variant="ghost"
            class="w-full gap-1.5 text-xs text-destructive hover:bg-destructive/10 cursor-pointer h-8"
            @click="logoutUser"
          >
            <LogOut class="size-3.5" />
            <span>Keluar dari Akun ({{ currentUser.name }})</span>
          </Button>

          <button
            v-else
            type="button"
            class="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1 mx-auto pt-1 cursor-pointer"
            @click="isAuthDialogOpen = true"
          >
            <Lock class="size-3" />
            <span>Login sebagai Administrator</span>
            <ArrowRight class="size-2.5" />
          </button>
        </div>
      </CardContent>
    </Card>

    <!-- Auth Dialog for Admin Access -->
    <AuthDialog v-model:open="isAuthDialogOpen" />
  </div>
</template>
