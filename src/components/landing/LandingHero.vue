<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { isFeatureEnabled } from '@/lib/featureFlags'
import {
  Sparkles,
  ArrowRight,
  Zap,
  Globe2,
  GraduationCap,
  Award,
  Flame,
  CheckCircle2
} from '@lucide/vue'

defineProps<{
  isDemoLoggingIn?: boolean
}>()

const emit = defineEmits<{
  (e: 'open-auth'): void
  (e: 'quick-demo'): void
  (e: 'scroll-to', id: string): void
}>()
</script>

<template>
  <section class="relative pt-12 pb-18 md:pt-20 md:pb-26 overflow-hidden">
    <!-- Subtle Ambient Glow -->
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] sm:w-[950px] h-[450px] bg-gradient-to-tr from-primary/20 via-emerald-500/10 to-teal-400/15 blur-3xl opacity-60 pointer-events-none rounded-full"></div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
      <!-- Floating Tag Badge -->
      <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs sm:text-sm font-semibold mb-6 shadow-xs backdrop-blur-md">
        <Sparkles class="size-4 animate-spin text-primary" style="animation-duration: 4s;" />
        <span>Platform Pembelajaran Bahasa Terpadu • Kurikulum & Sertifikasi Resmi</span>
      </div>

      <!-- Main Headline -->
      <h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-foreground max-w-5xl mx-auto leading-[1.12]">
        Kuasai Bahasa Impianmu dengan
        <span class="block mt-1 sm:mt-2 bg-gradient-to-r from-primary via-emerald-500 to-teal-400 bg-clip-text text-transparent drop-shadow-xs">
          Kursus Terpadu, Suara Asli & Sertifikasi
        </span>
      </h1>

      <!-- Supporting Subtitle -->
      <p class="mt-6 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-normal">
        Pelajari tata bahasa lewat modul <strong>Markdown</strong>, uji pemahaman dengan <strong>kuis interaktif</strong>, dengarkan <strong>TTS 11 Bahasa</strong> aksen penutur asli, dan raih <strong>sertifikat ber-QR Code</strong> resmi.
      </p>

      <!-- CTA Action Buttons -->
      <div class="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 max-w-lg mx-auto">
        <Button
          size="lg"
          @click="emit('open-auth')"
          class="w-full sm:w-auto h-12 px-7 text-sm sm:text-base font-semibold shadow-md shadow-primary/25 gap-2 group cursor-pointer"
        >
          <span>Mulai Belajar Sekarang</span>
          <ArrowRight class="size-4 group-hover:translate-x-1 transition-transform" />
        </Button>

        <Button
          v-if="isFeatureEnabled('enable_demo_features')"
          size="lg"
          variant="outline"
          @click="emit('quick-demo')"
          :disabled="isDemoLoggingIn"
          class="w-full sm:w-auto h-12 px-6 text-sm sm:text-base font-medium gap-2 border-border/80 hover:bg-muted/80 backdrop-blur-xs cursor-pointer"
        >
          <Zap class="size-4 text-amber-500 fill-amber-500" />
          <span>{{ isDemoLoggingIn ? 'Membuka Demo...' : 'Pakai Akun Demo (1-Klik)' }}</span>
        </Button>
        <Button
          v-else
          size="lg"
          variant="outline"
          @click="emit('scroll-to', 'katalog')"
          class="w-full sm:w-auto h-12 px-6 text-sm sm:text-base font-medium gap-2 border-border/80 hover:bg-muted/80 backdrop-blur-xs cursor-pointer"
        >
          <Globe2 class="size-4 text-primary" />
          <span>Jelajahi Katalog Kursus</span>
        </Button>
      </div>

      <!-- Quick Trust Indicators / Guarantees -->
      <div class="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <div class="flex items-center gap-1.5">
          <CheckCircle2 class="size-3.5 text-emerald-500" />
          <span>Bebas Iklan & Tanpa Pelacak</span>
        </div>
        <div class="flex items-center gap-1.5">
          <CheckCircle2 class="size-3.5 text-emerald-500" />
          <span>Sertifikat Digital Terverifikasi</span>
        </div>
        <div class="flex items-center gap-1.5">
          <CheckCircle2 class="size-3.5 text-emerald-500" />
          <span>Akses Gratis Selamanya</span>
        </div>
      </div>

      <!-- Quick Metrics Highlights Ribbon -->
      <div class="mt-14 pt-8 border-t border-border/60 max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-left">
        <!-- Metric 1 -->
        <div class="flex items-center gap-3.5 p-3 rounded-2xl bg-card/60 border border-border/60 backdrop-blur-sm">
          <div class="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Globe2 class="size-5" />
          </div>
          <div>
            <div class="text-xl font-extrabold text-foreground">11 Bahasa</div>
            <div class="text-xs text-muted-foreground">TTS Aksen Penutur Asli</div>
          </div>
        </div>

        <!-- Metric 2 -->
        <div class="flex items-center gap-3.5 p-3 rounded-2xl bg-card/60 border border-border/60 backdrop-blur-sm">
          <div class="size-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <GraduationCap class="size-5" />
          </div>
          <div>
            <div class="text-xl font-extrabold text-foreground">Modul Terpadu</div>
            <div class="text-xs text-muted-foreground">Teori & 3 Format Kuis</div>
          </div>
        </div>

        <!-- Metric 3 -->
        <div class="flex items-center gap-3.5 p-3 rounded-2xl bg-card/60 border border-border/60 backdrop-blur-sm">
          <div class="size-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Award class="size-5" />
          </div>
          <div>
            <div class="text-xl font-extrabold text-foreground">Sertifikat QR</div>
            <div class="text-xs text-muted-foreground">Verifikasi Publik Online</div>
          </div>
        </div>

        <!-- Metric 4 -->
        <div class="flex items-center gap-3.5 p-3 rounded-2xl bg-card/60 border border-border/60 backdrop-blur-sm">
          <div class="size-11 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <Flame class="size-5" />
          </div>
          <div>
            <div class="text-xl font-extrabold text-foreground">XP & Streak</div>
            <div class="text-xs text-muted-foreground">Gamifikasi Progres Harian</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
