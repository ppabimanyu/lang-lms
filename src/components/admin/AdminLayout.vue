<script setup lang="ts">
import { computed } from 'vue'
import { adminActiveTab, isServerConnected } from '@/lib/storage'
import AdminSidebar from './AdminSidebar.vue'
import AdminDashboardOverview from '@/views/admin/AdminDashboardOverview.vue'
import AdminUsersView from '@/views/admin/AdminUsersView.vue'
import AdminCoursesView from '@/views/admin/AdminCoursesView.vue'
import AdminQuizActivityView from '@/views/admin/AdminQuizActivityView.vue'
import AdminFeatureFlagsView from '@/views/admin/AdminFeatureFlagsView.vue'
import DownloadToast from '@/components/ui/DownloadToast.vue'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Activity,
  SlidersHorizontal
} from '@lucide/vue'

const currentTabInfo = computed(() => {
  switch (adminActiveTab.value) {
    case 'dashboard':
      return { title: 'Dashboard Monitoring', icon: LayoutDashboard, subtitle: 'Ringkasan Metrik & Status Ekosistem' }
    case 'users':
      return { title: 'Manajemen Pengguna', icon: Users, subtitle: 'Audit Akun, Aktivasi/Deaktivasi & Hak Role' }
    case 'courses':
      return { title: 'Moderasi Kursus', icon: BookOpen, subtitle: 'Audit Materi, Bank Soal, Takedown & Pemulihan' }
    case 'activity':
      return { title: 'Log Aktivitas Kuis', icon: Activity, subtitle: 'Pemantauan Live Sesi Kuis, Akurasi & Skor XP' }
    case 'flags':
      return { title: 'Feature Flags & Kontrol Sistem', icon: SlidersHorizontal, subtitle: 'Manajemen Sakelar Fitur Real-Time & Mode Perawatan' }
    default:
      return { title: 'Dashboard Monitoring', icon: LayoutDashboard, subtitle: '' }
  }
})
</script>

<template>
  <SidebarProvider class="h-screen w-full bg-background text-foreground antialiased overflow-hidden font-sans">
    <!-- Dedicated Admin Sidebar Navigation -->
    <AdminSidebar />

    <!-- Main Admin Workspace Inset Area -->
    <SidebarInset class="flex flex-col h-screen overflow-hidden bg-background">
      <!-- Top Bar with SidebarTrigger & Current Tab Breadcrumb -->
      <header class="flex h-13 shrink-0 items-center justify-between border-b border-border/60 px-4 sm:px-6 bg-background/80 backdrop-blur-md z-20">
        <div class="flex items-center gap-2.5">
          <SidebarTrigger class="size-8 text-muted-foreground hover:text-foreground cursor-pointer" />
          <Separator orientation="vertical" class="h-6" />
          <div class="flex items-center gap-2 text-xs">
            <component :is="currentTabInfo.icon" class="size-4 text-indigo-600 dark:text-indigo-400" />
            <span class="font-bold text-foreground text-sm">{{ currentTabInfo.title }}</span>
            <span class="text-muted-foreground hidden sm:inline">•</span>
            <span class="text-muted-foreground hidden sm:inline text-xs">{{ currentTabInfo.subtitle }}</span>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- PostgreSQL Status Indicator -->
          <div class="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 border border-border/70 text-[11px] font-mono">
            <span class="size-2 rounded-full" :class="isServerConnected ? 'bg-emerald-500' : 'bg-amber-500'"></span>
            <span class="text-muted-foreground">{{ isServerConnected ? 'PostgreSQL Terhubung' : 'Offline' }}</span>
          </div>

          <Badge variant="outline" class="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30 text-[10px] font-mono uppercase tracking-wider">
            Portal Admin
          </Badge>
        </div>
      </header>

      <!-- Main Workspace Scrollable View -->
      <main class="flex-1 overflow-y-auto px-4 sm:px-8 py-5 md:py-7">
        <transition name="fade-slide" mode="out-in">
          <component
            :is="
              adminActiveTab === 'dashboard'
                ? AdminDashboardOverview
                : adminActiveTab === 'users'
                ? AdminUsersView
                : adminActiveTab === 'courses'
                ? AdminCoursesView
                : adminActiveTab === 'activity'
                ? AdminQuizActivityView
                : AdminFeatureFlagsView
            "
          />
        </transition>
      </main>

      <!-- Global Download Toast Notifications -->
      <DownloadToast />
    </SidebarInset>
  </SidebarProvider>
</template>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
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
