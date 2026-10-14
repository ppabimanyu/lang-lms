<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { isDarkMode, toggleTheme } from '@/lib/theme'
import { isFeatureEnabled } from '@/lib/featureFlags'
import {
  Sparkles,
  ShieldCheck,
  HelpCircle,
  Sun,
  Moon,
  Zap,
  Menu,
  X,
  GraduationCap
} from '@lucide/vue'

defineProps<{
  isDemoLoggingIn?: boolean
}>()

const emit = defineEmits<{
  (e: 'open-auth'): void
  (e: 'open-guide'): void
  (e: 'open-verify'): void
  (e: 'quick-demo'): void
}>()

const isMobileMenuOpen = ref(false)

function scrollToSection(id: string) {
  isMobileMenuOpen.value = false
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}
</script>

<template>
  <header class="sticky top-0 z-50 w-full border-b border-border/60 bg-background/85 backdrop-blur-xl transition-colors">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <!-- Logo & Brand -->
      <a href="#" class="flex items-center gap-3 group select-none">
        <div class="size-9 rounded-xl bg-gradient-to-br from-primary via-emerald-500 to-teal-500 flex items-center justify-center text-primary-foreground shadow-sm shadow-primary/30 group-hover:scale-105 transition-transform">
          <Sparkles class="size-5" />
        </div>
        <div class="flex flex-col">
          <span class="font-extrabold text-lg leading-tight tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text">
            Lingua <span class="text-primary font-black">LMS</span>
          </span>
          <span class="text-[10px] text-muted-foreground font-medium -mt-0.5">Platform Bahasa Terpadu</span>
        </div>
      </a>

      <!-- Desktop Navigation Links -->
      <nav class="hidden lg:flex items-center gap-7 text-sm font-medium text-muted-foreground">
        <button @click="scrollToSection('katalog')" class="hover:text-foreground transition-colors cursor-pointer">
          Katalog Kursus
        </button>
        <button @click="scrollToSection('demo')" class="hover:text-foreground transition-colors cursor-pointer">
          Fitur Interaktif
        </button>
        <button @click="scrollToSection('fitur')" class="hover:text-foreground transition-colors cursor-pointer">
          Fitur Unggulan
        </button>
        <button @click="scrollToSection('sertifikat')" class="hover:text-foreground transition-colors cursor-pointer flex items-center gap-1.5 text-primary">
          <ShieldCheck class="size-4" />
          <span>Sertifikasi QR</span>
        </button>
        <button @click="scrollToSection('faq')" class="hover:text-foreground transition-colors cursor-pointer">
          FAQ
        </button>
        <button @click="emit('open-guide')" class="hover:text-foreground transition-colors flex items-center gap-1.5 cursor-pointer">
          <HelpCircle class="size-4 text-primary" />
          <span>Panduan</span>
        </button>
      </nav>

      <!-- Right Action Controls -->
      <div class="flex items-center gap-2 sm:gap-2.5">
        <!-- Theme Toggle -->
        <Button
          variant="ghost"
          size="icon"
          @click="toggleTheme"
          class="text-muted-foreground hover:text-foreground size-9 rounded-lg"
          :title="isDarkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'"
        >
          <Sun v-if="isDarkMode" class="size-4 text-amber-400" />
          <Moon v-else class="size-4" />
        </Button>

        <!-- Login Trigger -->
        <Button
          variant="ghost"
          size="sm"
          @click="emit('open-auth')"
          class="font-medium text-xs sm:text-sm h-9 px-3"
        >
          Masuk
        </Button>

        <!-- Quick 1-Click Demo / Primary CTA -->
        <Button
          v-if="isFeatureEnabled('enable_demo_features')"
          size="sm"
          @click="emit('quick-demo')"
          :disabled="isDemoLoggingIn"
          class="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs sm:text-sm h-9 px-3.5 shadow-sm shadow-primary/20 gap-1.5 hidden sm:inline-flex cursor-pointer"
        >
          <Zap class="size-3.5 fill-current text-amber-300" />
          <span>{{ isDemoLoggingIn ? 'Memuat...' : 'Coba Demo 1-Klik' }}</span>
        </Button>
        <Button
          v-else
          size="sm"
          @click="emit('open-auth')"
          class="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs sm:text-sm h-9 px-3.5 shadow-sm shadow-primary/20 gap-1.5 hidden sm:inline-flex cursor-pointer"
        >
          <Sparkles class="size-3.5" />
          <span>Mulai Belajar</span>
        </Button>

        <!-- Mobile Menu Toggle Button -->
        <Button
          variant="ghost"
          size="icon"
          class="lg:hidden size-9 text-muted-foreground"
          @click="isMobileMenuOpen = !isMobileMenuOpen"
          :aria-label="isMobileMenuOpen ? 'Tutup menu' : 'Buka menu'"
        >
          <X v-if="isMobileMenuOpen" class="size-5" />
          <Menu v-else class="size-5" />
        </Button>
      </div>
    </div>

    <!-- Mobile Dropdown Navigation -->
    <div
      v-if="isMobileMenuOpen"
      class="lg:hidden border-b border-border/80 bg-background/95 backdrop-blur-2xl px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200"
    >
      <div class="flex flex-col gap-2 text-sm font-medium">
        <button
          @click="scrollToSection('katalog')"
          class="text-left px-3 py-2 rounded-lg hover:bg-muted text-foreground transition-colors flex items-center justify-between"
        >
          <span>Katalog Kursus</span>
          <GraduationCap class="size-4 text-primary" />
        </button>
        <button
          @click="scrollToSection('demo')"
          class="text-left px-3 py-2 rounded-lg hover:bg-muted text-foreground transition-colors"
        >
          Fitur Interaktif
        </button>
        <button
          @click="scrollToSection('fitur')"
          class="text-left px-3 py-2 rounded-lg hover:bg-muted text-foreground transition-colors"
        >
          Fitur Unggulan
        </button>
        <button
          @click="scrollToSection('sertifikat')"
          class="text-left px-3 py-2 rounded-lg hover:bg-muted text-primary font-semibold transition-colors flex items-center gap-2"
        >
          <ShieldCheck class="size-4" />
          <span>Sertifikasi & Verifikasi QR</span>
        </button>
        <button
          @click="scrollToSection('faq')"
          class="text-left px-3 py-2 rounded-lg hover:bg-muted text-foreground transition-colors"
        >
          FAQ
        </button>
        <button
          @click="isMobileMenuOpen = false; emit('open-guide')"
          class="text-left px-3 py-2 rounded-lg hover:bg-muted text-foreground transition-colors flex items-center gap-2"
        >
          <HelpCircle class="size-4 text-primary" />
          <span>Panduan Penggunaan</span>
        </button>
      </div>

      <div class="pt-2 border-t border-border/60 flex flex-col gap-2">
        <Button
          v-if="isFeatureEnabled('enable_demo_features')"
          size="sm"
          @click="isMobileMenuOpen = false; emit('quick-demo')"
          :disabled="isDemoLoggingIn"
          class="w-full bg-primary text-primary-foreground font-semibold gap-2 py-2"
        >
          <Zap class="size-4 fill-current text-amber-300" />
          <span>{{ isDemoLoggingIn ? 'Memuat Demo...' : 'Coba Demo 1-Klik' }}</span>
        </Button>
        <Button
          v-else
          size="sm"
          @click="isMobileMenuOpen = false; emit('open-auth')"
          class="w-full bg-primary text-primary-foreground font-semibold gap-2 py-2"
        >
          <Sparkles class="size-4" />
          <span>Mulai Belajar Sekarang</span>
        </Button>
      </div>
    </div>
  </header>
</template>
