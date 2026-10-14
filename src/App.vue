<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { activeTab, currentUser, isAuthLoading } from '@/lib/storage'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import DashboardView from '@/views/DashboardView.vue'
import CoursesView from '@/views/CoursesView.vue'
import CourseDetailView from '@/views/CourseDetailView.vue'
import MyCoursesView from '@/views/MyCoursesView.vue'
import FileManagerView from '@/views/FileManagerView.vue'
import AccountSettingsView from '@/views/AccountSettingsView.vue'
import CertificateVerificationView from '@/views/CertificateVerificationView.vue'
import UserProfileView from '@/views/UserProfileView.vue'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import LandingView from '@/views/LandingView.vue'
import MaintenanceView from '@/components/maintenance/MaintenanceView.vue'
import DownloadToast from '@/components/ui/DownloadToast.vue'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard,
  GraduationCap,
  UploadCloud,
  Loader2,
  FolderGit2,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  User
} from '@lucide/vue'

import { initRouter, verifyParamId } from '@/lib/router'
import { fetchFeatureFlags, isMaintenanceActive } from '@/lib/featureFlags'

onMounted(() => {
  initRouter()
  fetchFeatureFlags()
})

const currentTabInfo = computed(() => {
  switch (activeTab.value) {
    case 'dashboard':
      return { title: 'Dashboard', icon: LayoutDashboard, subtitle: 'Ringkasan & Progres Belajar' }
    case 'courses':
      return { title: 'Katalog Kursus', icon: GraduationCap, subtitle: 'Jalur Pembelajaran Multi-Bab & Ujian Akhir' }
    case 'course-detail':
      return { title: 'Ruang Belajar Kursus', icon: GraduationCap, subtitle: 'Materi, Kuis Bab, Flashcard & Ujian Kelulusan' }
    case 'my-courses':
      return { title: 'Kursus Saya', icon: FolderGit2, subtitle: 'Kelola Kursus, Visibilitas & Batas Waktu' }
    case 'manager':
      return { title: 'Buat & Impor Kursus', icon: UploadCloud, subtitle: 'Unggah Markdown & CSV Terpadu' }
    case 'account':
      return { title: 'Pengaturan Akun', icon: Settings, subtitle: 'Profil, Keamanan, Preferensi & Progres' }
    case 'verify':
      return { title: 'Verifikasi Sertifikat', icon: ShieldCheck, subtitle: 'Pemeriksaan Keabsahan & Validasi QR Code' }
    case 'user-profile':
      return { title: 'Profil Pengguna', icon: User, subtitle: 'Informasi Publik & Portofolio Kursus' }
    case 'admin':
      return { title: 'Panel Administrator', icon: ShieldAlert, subtitle: 'Audit Pengguna, Takedown Kursus & Pemantauan Sistem' }
    default:
      return { title: 'Dashboard', icon: LayoutDashboard, subtitle: '' }
  }
})
</script>

<template>
  <!-- Loading state during token/auth verification -->
  <div v-if="isAuthLoading" class="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground">
    <div class="flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-300">
      <div class="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm shadow-primary/20">
        <Sparkles class="size-6 animate-pulse" />
      </div>
      <div class="flex items-center gap-2 text-sm text-muted-foreground font-medium">
        <Loader2 class="size-4 animate-spin text-primary" />
        <span>Memuat Lingua LMS...</span>
      </div>
    </div>
  </div>

  <!-- Global Maintenance Mode Screen for non-admin users/visitors -->
  <div v-else-if="isMaintenanceActive && currentUser?.role !== 'admin'" class="min-h-screen w-full bg-background">
    <MaintenanceView />
  </div>

  <!-- Public Standalone Verification View (When visitor visits ?verify= or clicks verify without being logged in) -->
  <div v-else-if="activeTab === 'verify' && !currentUser" class="min-h-screen w-full bg-background">
    <CertificateVerificationView :initial-cert-id="verifyParamId" />
  </div>

  <!-- Unauthenticated Guest View: High-Conversion Landing Page -->
  <div v-else-if="!currentUser" class="min-h-screen w-full bg-background">
    <LandingView />
  </div>

  <!-- Dedicated Admin Layout for Admin Users (Completely separated from user dashboard) -->
  <AdminLayout v-else-if="currentUser?.role === 'admin'" />

  <!-- Authenticated User App Workspace (Dashboard, Lessons, Quizzes, File Manager) -->
  <SidebarProvider v-else class="h-screen w-full bg-background text-foreground antialiased overflow-hidden font-sans">
    <!-- Sidebar Navigation (shadcn-vue) -->
    <AppSidebar />

    <!-- Main Workspace Inset Area -->
    <SidebarInset class="flex flex-col h-screen overflow-hidden bg-background">
      <!-- Top Bar with SidebarTrigger & Current Tab Breadcrumb -->
      <header class="flex h-12 shrink-0 items-center justify-between border-b border-border/60 px-4 bg-background/80 backdrop-blur-md z-20">
        <div class="flex items-center gap-2.5">
          <SidebarTrigger class="size-8 text-muted-foreground hover:text-foreground" />
          <Separator orientation="vertical" class="h-8" />
          <div class="flex items-center gap-2 text-xs">
            <component :is="currentTabInfo.icon" class="size-3.5 text-primary" />
            <span class="font-semibold text-foreground">{{ currentTabInfo.title }}</span>
            <span class="text-muted-foreground hidden sm:inline">•</span>
            <span class="text-muted-foreground hidden sm:inline">{{ currentTabInfo.subtitle }}</span>
          </div>
        </div>

        <div class="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
          <span class="hidden md:inline bg-muted/60 border border-border/80 px-2 py-0.5 rounded text-[10px]">
            ⌘B / Ctrl+B
          </span>
        </div>
      </header>

      <!-- Main Workspace Scrollable View -->
      <main id="app-main-scroll" class="flex-1 overflow-y-auto px-4 sm:px-8 py-5 md:py-7">
        <transition name="fade-slide" mode="out-in">
          <component
            :is="
              activeTab === 'dashboard'
                ? DashboardView
                : activeTab === 'courses'
                ? CoursesView
                : activeTab === 'course-detail'
                ? CourseDetailView
                : activeTab === 'my-courses'
                ? MyCoursesView
                : activeTab === 'account'
                ? AccountSettingsView
                : activeTab === 'user-profile'
                ? UserProfileView
                : activeTab === 'verify'
                ? CertificateVerificationView
                : FileManagerView
            "
            :initial-cert-id="activeTab === 'verify' ? verifyParamId : undefined"
          />
        </transition>
      </main>
    </SidebarInset>
  </SidebarProvider>

  <!-- Global Floating Download Toast Notification -->
  <DownloadToast />
</template>

<style>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
