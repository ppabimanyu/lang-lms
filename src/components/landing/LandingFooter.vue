<script setup lang="ts">
import {
  Sparkles,
  ShieldCheck,
  HelpCircle
} from '@lucide/vue'

const emit = defineEmits<{
  (e: 'open-verify'): void
  (e: 'open-guide'): void
}>()

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}
</script>

<template>
  <footer class="border-t border-border/60 bg-card/60 pt-16 pb-12 relative z-10 transition-colors">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-border/60">
        <!-- Brand Info -->
        <div class="md:col-span-5 space-y-4">
          <div class="flex items-center gap-3 select-none">
            <div class="size-9 rounded-xl bg-gradient-to-br from-primary via-emerald-500 to-teal-500 flex items-center justify-center text-primary-foreground shadow-sm shadow-primary/25">
              <Sparkles class="size-5" />
            </div>
            <div class="flex flex-col">
              <span class="font-bold text-lg leading-tight tracking-tight text-foreground">
                Lingua <span class="text-primary font-black">LMS</span>
              </span>
              <span class="text-[10px] text-muted-foreground font-medium -mt-0.5">Platform Bahasa Terpadu</span>
            </div>
          </div>

          <p class="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-sm">
            Platform pembelajaran bahasa mandiri dengan integrasi teori tata bahasa Markdown, latihan kuis interaktif, audio aksen penutur asli 11 bahasa, dan sertifikasi kelulusan ber-QR Code.
          </p>

          <div class="flex items-center gap-2 pt-1 text-xs text-muted-foreground font-mono">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px]">
              <span class="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>PostgreSQL 16 Engine</span>
            </span>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border/60 text-[11px]">
              <span>Web Speech API</span>
            </span>
          </div>
        </div>

        <!-- Links Col 1: Pembelajaran -->
        <div class="md:col-span-3 space-y-3">
          <h4 class="font-bold text-sm text-foreground">Pembelajaran</h4>
          <ul class="space-y-2 text-xs text-muted-foreground">
            <li>
              <button @click="scrollToSection('katalog')" class="hover:text-foreground transition-colors cursor-pointer">
                Katalog Kursus
              </button>
            </li>
            <li>
              <button @click="scrollToSection('demo')" class="hover:text-foreground transition-colors cursor-pointer">
                Audio Penutur Asli
              </button>
            </li>
            <li>
              <button @click="scrollToSection('demo')" class="hover:text-foreground transition-colors cursor-pointer">
                Playground Kuis Interaktif
              </button>
            </li>
            <li>
              <button @click="scrollToSection('fitur')" class="hover:text-foreground transition-colors cursor-pointer">
                Fitur & Gamifikasi
              </button>
            </li>
          </ul>
        </div>

        <!-- Links Col 2: Sertifikasi & Bantuan -->
        <div class="md:col-span-4 space-y-3">
          <h4 class="font-bold text-sm text-foreground">Sertifikasi & Layanan</h4>
          <ul class="space-y-2 text-xs text-muted-foreground">
            <li>
              <button @click="emit('open-verify')" class="hover:text-primary transition-colors flex items-center gap-1.5 font-medium text-primary cursor-pointer">
                <ShieldCheck class="size-3.5" />
                <span>Verifikasi Sertifikat Online</span>
              </button>
            </li>
            <li>
              <button @click="emit('open-guide')" class="hover:text-foreground transition-colors flex items-center gap-1.5 cursor-pointer">
                <HelpCircle class="size-3.5 text-primary" />
                <span>Panduan Format Markdown & CSV</span>
              </button>
            </li>
            <li>
              <button @click="scrollToSection('faq')" class="hover:text-foreground transition-colors cursor-pointer">
                Pertanyaan yang Sering Diajukan (FAQ)
              </button>
            </li>
            <li>
              <span class="text-muted-foreground/70">
                Lisensi Bebas Terbuka • Dibuat untuk Komunitas
              </span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Bottom Bar -->
      <div class="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <div>
          © 2026 <strong>Lingua LMS Academy</strong>. Hak Cipta Dilindungi.
        </div>
        <div class="flex items-center gap-4 text-[11px]">
          <span>Dirancang dengan Vue 3 & TypeScript</span>
          <span>•</span>
          <span>Shadcn UI & TailwindCSS</span>
        </div>
      </div>
    </div>
  </footer>
</template>
