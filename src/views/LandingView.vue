<script setup lang="ts">
import { ref } from 'vue'
import LandingNavbar from '@/components/landing/LandingNavbar.vue'
import LandingHero from '@/components/landing/LandingHero.vue'
import LandingFeaturedCourses from '@/components/landing/LandingFeaturedCourses.vue'
import LandingDemoPlayground from '@/components/landing/LandingDemoPlayground.vue'
import LandingFeatures from '@/components/landing/LandingFeatures.vue'
import LandingCertificateShowcase from '@/components/landing/LandingCertificateShowcase.vue'
import LandingReviews from '@/components/landing/LandingReviews.vue'
import LandingFaq from '@/components/landing/LandingFaq.vue'
import LandingCta from '@/components/landing/LandingCta.vue'
import LandingFooter from '@/components/landing/LandingFooter.vue'
import AuthDialog from '@/components/auth/AuthDialog.vue'
import UserGuideModal from '@/components/guide/UserGuideModal.vue'
import { loginUser, activeTab } from '@/lib/storage'

const isAuthDialogOpen = ref(false)
const isGuideModalOpen = ref(false)
const isDemoLoggingIn = ref(false)

function openVerification() {
  activeTab.value = 'verify'
}

// 1-Click Fast Demo Login from Landing Page
async function handleQuickDemoLogin() {
  isDemoLoggingIn.value = true
  try {
    await loginUser('demo@lingua.com', 'password123')
  } catch (err) {
    console.error('Demo login error:', err)
    // fallback open dialog if network error
    isAuthDialogOpen.value = true
  } finally {
    isDemoLoggingIn.value = false
  }
}

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}
</script>

<template>
  <div class="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary flex flex-col font-sans transition-colors">
    <!-- Ambient Background Lighting Accent -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <div class="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-b from-primary/15 via-primary/5 to-transparent blur-3xl opacity-75"></div>
      <div class="absolute top-[700px] -left-48 w-[650px] h-[550px] bg-emerald-500/10 blur-3xl rounded-full opacity-50"></div>
      <div class="absolute top-[1200px] -right-48 w-[650px] h-[550px] bg-primary/10 blur-3xl rounded-full opacity-45"></div>
      <div class="absolute top-[2200px] left-1/4 w-[750px] h-[500px] bg-amber-500/8 blur-3xl rounded-full opacity-40"></div>
    </div>

    <!-- 1. Header / Navbar -->
    <LandingNavbar
      :is-demo-logging-in="isDemoLoggingIn"
      @open-auth="isAuthDialogOpen = true"
      @open-guide="isGuideModalOpen = true"
      @open-verify="openVerification"
      @quick-demo="handleQuickDemoLogin"
    />

    <!-- Main Landing Page Sections -->
    <main class="flex-1 z-10 space-y-4 sm:space-y-8">
      <!-- 2. Hero Section with Key Metrics -->
      <LandingHero
        :is-demo-logging-in="isDemoLoggingIn"
        @open-auth="isAuthDialogOpen = true"
        @quick-demo="handleQuickDemoLogin"
        @scroll-to="scrollToSection"
      />

      <!-- 3. Interactive Playground (TTS 11 Bahasa & Kuis Mini) -->
      <LandingDemoPlayground />

      <!-- 4. Featured Courses Catalog Preview -->
      <LandingFeaturedCourses
        @open-auth="isAuthDialogOpen = true"
      />

      <!-- 5. 6 Core Pillars & Features -->
      <LandingFeatures />

      <!-- 6. Official Digital Certificate & Instant Verification -->
      <LandingCertificateShowcase
        @open-verify="openVerification"
      />

      <!-- 7. Learner Testimonials & Reviews -->
      <LandingReviews />

      <!-- 8. Interactive FAQ Accordion -->
      <LandingFaq />

      <!-- 9. Final Call to Action Banner -->
      <LandingCta
        :is-demo-logging-in="isDemoLoggingIn"
        @open-auth="isAuthDialogOpen = true"
        @quick-demo="handleQuickDemoLogin"
      />
    </main>

    <!-- 10. Comprehensive Footer -->
    <LandingFooter
      @open-verify="openVerification"
      @open-guide="isGuideModalOpen = true"
    />

    <!-- Auth Modal Dialog -->
    <AuthDialog v-model:open="isAuthDialogOpen" />

    <!-- User Guide Modal Dialog -->
    <UserGuideModal v-model:open="isGuideModalOpen" />
  </div>
</template>
