<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { isFeatureEnabled } from '@/lib/featureFlags'
import {
  Sparkles,
  Zap,
  Lock
} from '@lucide/vue'

defineProps<{
  isDemoLoggingIn?: boolean
}>()

const emit = defineEmits<{
  (e: 'open-auth'): void
  (e: 'quick-demo'): void
}>()
</script>

<template>
  <section class="py-20 md:py-28 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="rounded-3xl bg-gradient-to-br from-primary/15 via-emerald-500/5 to-card border border-primary/25 p-8 sm:p-14 lg:p-16 text-center relative overflow-hidden shadow-xl">
      <!-- Glow decoration -->
      <div class="absolute -top-24 -left-24 w-72 h-72 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>

      <div class="relative z-10 max-w-2xl mx-auto space-y-6">
        <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
          <Sparkles class="size-3.5" />
          <span>Mulai Hari Ini • 100% Bebas Biaya</span>
        </div>

        <h2 class="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground leading-tight">
          Siap Menguasai Bahasa Impianmu?
        </h2>

        <p class="text-muted-foreground text-sm sm:text-base leading-relaxed">
          Bergabunglah sekarang untuk mengakses seluruh katalog kursus terpadu, melatih pendengaran dengan suara penutur asli, dan raih sertifikat kelulusan digitalmu.
        </p>

        <!-- CTA Buttons -->
        <div class="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
          <Button
            size="lg"
            @click="emit('open-auth')"
            class="w-full sm:w-auto h-12 px-8 font-semibold shadow-md shadow-primary/25 gap-2 cursor-pointer"
          >
            <Lock class="size-4" />
            <span>Daftar / Masuk Akun</span>
          </Button>

          <Button
            v-if="isFeatureEnabled('enable_demo_features')"
            size="lg"
            variant="outline"
            @click="emit('quick-demo')"
            :disabled="isDemoLoggingIn"
            class="w-full sm:w-auto h-12 px-6 font-medium gap-2 border-border/80 hover:bg-muted/80 cursor-pointer"
          >
            <Zap class="size-4 text-amber-500 fill-amber-500" />
            <span>{{ isDemoLoggingIn ? 'Membuka Demo...' : 'Pakai Akun Demo (1-Klik)' }}</span>
          </Button>
        </div>
      </div>
    </div>
  </section>
</template>
