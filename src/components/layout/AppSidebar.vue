<script setup lang="ts">
import { ref } from 'vue'
import { activeTab, stats, courses, myCourses, currentUser, logoutUser, isServerConnected } from '@/lib/storage'
import type { NavigationTab } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarFooter,
  SidebarRail
} from '@/components/ui/sidebar'
import { globalTargetLanguage, speechRate, findLanguageInfo } from '@/lib/tts'
import AudioSettingsDialog from '@/components/audio/AudioSettingsDialog.vue'
import UserGuideModal from '@/components/guide/UserGuideModal.vue'
import AuthDialog from '@/components/auth/AuthDialog.vue'
import { Badge } from '@/components/ui/badge'
import {
  LayoutDashboard,
  UploadCloud,
  Flame,
  Trophy,
  Moon,
  Sun,
  GraduationCap,
  Volume2,
  HelpCircle,
  User,
  LogOut,
  FolderGit2,
  ShieldCheck
} from '@lucide/vue'
import { isDarkMode, toggleTheme as toggleDarkMode } from '@/lib/theme'
import { isFeatureEnabled } from '@/lib/featureFlags'

const isAudioSettingsOpen = ref(false)
const isGuideModalOpen = ref(false)
const isAuthDialogOpen = ref(false)

function selectTab(tab: NavigationTab) {
  activeTab.value = tab
}
</script>

<template>
  <Sidebar collapsible="icon" class="border-r border-sidebar-border select-none">
    <!-- Sidebar Header: Brand -->
    <SidebarHeader class="p-3">
      <div class="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
        <div
          class="flex items-center gap-2.5 overflow-hidden cursor-pointer"
          @click="selectTab('dashboard')"
          title="Lingua LMS"
        >
          <div class="size-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-xs">
            <GraduationCap class="size-5" />
          </div>
          <div class="flex flex-col min-w-0 transition-opacity duration-200 group-data-[collapsible=icon]:hidden">
            <span class="font-bold text-sm tracking-tight text-sidebar-foreground truncate">Lingua LMS</span>
            <span class="text-[11px] text-muted-foreground truncate flex items-center gap-1.5">
              <span>Deutsch A1</span>
              <span class="size-1.5 rounded-full" :class="isServerConnected ? 'bg-emerald-500' : 'bg-amber-500'" :title="isServerConnected ? 'PostgreSQL Terhubung' : 'Offline Mode'"></span>
              <span class="text-[9px] font-mono text-muted-foreground/80">PG</span>
            </span>
          </div>
        </div>
      </div>
    </SidebarHeader>

    <!-- Sidebar Content -->
    <SidebarContent class="gap-1">
      <!-- Stats Summary Strip (Hidden when collapsed) -->
      <div class="px-3 py-1.5 group-data-[collapsible=icon]:hidden">
        <div class="p-2.5 rounded-xl bg-sidebar-accent/60 border border-sidebar-border/60 flex items-center justify-around shadow-2xs">
          <div class="flex items-center gap-2">
            <div class="size-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Flame class="size-4" />
            </div>
            <div>
              <div class="text-xs font-semibold leading-none">{{ stats.streak }} Hari</div>
              <div class="text-[10px] text-muted-foreground">Streak</div>
            </div>
          </div>

          <div class="h-6 w-px bg-sidebar-border"></div>

          <div class="flex items-center gap-2">
            <div class="size-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
              <Trophy class="size-4" />
            </div>
            <div>
              <div class="text-xs font-semibold leading-none">{{ stats.xp }} XP</div>
              <div class="text-[10px] text-muted-foreground">Skor</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Navigation Group -->
      <SidebarGroup class="px-2 py-1">
        <SidebarGroupLabel class="text-[10px] uppercase font-semibold text-muted-foreground/80 tracking-wider">
          Menu Pembelajaran
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu class="gap-1">
            <!-- Dashboard -->
            <SidebarMenuItem>
              <SidebarMenuButton
                :is-active="activeTab === 'dashboard'"
                tooltip="Dashboard"
                @click="selectTab('dashboard')"
                class="data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:font-medium transition-colors"
              >
                <LayoutDashboard class="size-4" />
                <span>Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <!-- Katalog Kursus (Flagship) -->
            <SidebarMenuItem>
              <SidebarMenuButton
                :is-active="activeTab === 'courses' || activeTab === 'course-detail'"
                tooltip="Katalog Kursus"
                @click="selectTab('courses')"
                class="data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:font-medium transition-colors"
              >
                <GraduationCap class="size-4" />
                <span>Katalog Kursus</span>
              </SidebarMenuButton>
              <SidebarMenuBadge
                :class="(activeTab === 'courses' || activeTab === 'course-detail') ? 'text-primary-foreground bg-primary-foreground/20' : ''"
              >
                {{ courses.length }}
              </SidebarMenuBadge>
            </SidebarMenuItem>

            <!-- Kursus Saya (Dedicated Management) -->
            <SidebarMenuItem v-if="currentUser">
              <SidebarMenuButton
                :is-active="activeTab === 'my-courses'"
                tooltip="Kursus Saya"
                @click="selectTab('my-courses')"
                class="data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:font-medium transition-colors"
              >
                <FolderGit2 class="size-4" />
                <span>Kursus Saya</span>
              </SidebarMenuButton>
              <SidebarMenuBadge
                :class="activeTab === 'my-courses' ? 'text-primary-foreground bg-primary-foreground/20' : ''"
              >
                {{ myCourses.length }}
              </SidebarMenuBadge>
            </SidebarMenuItem>

            <!-- Impor & Kelola Kursus -->
            <SidebarMenuItem v-if="isFeatureEnabled('enable_course_creation')">
              <SidebarMenuButton
                :is-active="activeTab === 'manager'"
                tooltip="Buat & Impor Kursus"
                @click="selectTab('manager')"
                class="data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:font-medium transition-colors"
              >
                <UploadCloud class="size-4" />
                <span>Buat & Impor Kursus</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <!-- Verifikasi Sertifikat (Fitur Autentikasi QR) -->
            <SidebarMenuItem v-if="isFeatureEnabled('enable_certificates')">
              <SidebarMenuButton
                :is-active="activeTab === 'verify'"
                tooltip="Verifikasi Sertifikat"
                @click="selectTab('verify')"
                class="data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:font-medium transition-colors"
              >
                <ShieldCheck class="size-4" />
                <span>Verifikasi Sertifikat</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <!-- Help & Settings Group -->
      <SidebarGroup class="px-2 py-1 mt-auto">
        <!-- <SidebarGroupLabel class="text-[10px] uppercase font-semibold text-muted-foreground/80 tracking-wider">
          Bantuan & Pengaturan
        </SidebarGroupLabel> -->
        <SidebarGroupContent>
          <SidebarMenu class="gap-1">
            <!-- Buku Panduan -->
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Buku Panduan"
                @click="isGuideModalOpen = true"
              >
                <HelpCircle class="size-4 text-primary" />
                <span>Buku Panduan</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <!-- Sidebar Footer: Controls & User Profile (Style Layout Sidebar Admin) -->
    <SidebarFooter class="p-3 border-t border-sidebar-border gap-2">
      <!-- Baris 1: Pengaturan Suara -->
      <Button
        v-if="isFeatureEnabled('enable_tts')"
        variant="outline"
        size="sm"
        class="w-full h-8.5 px-2.5 text-xs justify-between border-sidebar-border hover:bg-sidebar-accent cursor-pointer group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center shadow-2xs"
        @click="isAudioSettingsOpen = true"
        :title="`Pengaturan Audio: ${findLanguageInfo(globalTargetLanguage).name} (${speechRate}x)`"
      >
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-sm shrink-0 group-data-[collapsible=icon]:mx-auto">{{ findLanguageInfo(globalTargetLanguage).flag }}</span>
          <span class="font-medium text-xs truncate text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            {{ findLanguageInfo(globalTargetLanguage).name }}
          </span>
        </div>
        <div class="flex items-center gap-1.5 text-muted-foreground group-data-[collapsible=icon]:hidden shrink-0">
          <span class="text-[10px] font-mono">{{ speechRate }}x</span>
          <Volume2 class="size-3.5" />
        </div>
      </Button>

      <!-- Baris 2: Tema (Mode Terang / Gelap) -->
      <Button
        variant="outline"
        size="sm"
        class="w-full h-8 text-xs gap-2 justify-center border-sidebar-border hover:bg-sidebar-accent cursor-pointer group-data-[collapsible=icon]:px-0 shadow-2xs"
        @click="toggleDarkMode"
        :title="isDarkMode ? 'Mode Terang' : 'Mode Gelap'"
      >
        <Sun v-if="isDarkMode" class="size-3.5 text-amber-500 shrink-0" />
        <Moon v-else class="size-3.5 text-indigo-500 shrink-0" />
        <span class="group-data-[collapsible=icon]:hidden text-[11px] font-medium text-sidebar-foreground">
          {{ isDarkMode ? 'Mode Terang' : 'Mode Gelap' }}
        </span>
      </Button>

      <!-- Baris 3: Akun Pengguna -->
      <div v-if="currentUser">
        <div
          class="p-2.5 rounded-xl border transition-all cursor-pointer group-data-[collapsible=icon]:p-1.5 shadow-2xs flex items-center justify-between group/user"
          :class="[
            activeTab === 'account'
              ? 'bg-primary/10 border-primary/50 text-primary'
              : 'bg-sidebar-accent/80 border-sidebar-border/80 hover:bg-sidebar-accent hover:border-sidebar-border'
          ]"
          @click="selectTab('account')"
          :title="`Pengaturan Akun: ${currentUser.name}`"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <div
              class="size-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-xs"
              :class="currentUser.role === 'curriculum'
                ? 'bg-emerald-600 text-white'
                : currentUser.role === 'partner'
                ? 'bg-blue-600 text-white'
                : 'bg-primary text-primary-foreground'"
            >
              <GraduationCap v-if="currentUser.role === 'curriculum'" class="size-4" />
              <ShieldCheck v-else-if="currentUser.role === 'partner'" class="size-4" />
              <span v-else>{{ currentUser.name.charAt(0).toUpperCase() }}</span>
            </div>
            <div class="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
              <span class="text-xs font-semibold text-sidebar-foreground truncate">{{ currentUser.name }}</span>
              <span class="text-[10px] text-muted-foreground truncate">{{ currentUser.email }}</span>
            </div>
          </div>

          <div class="flex items-center gap-1.5 shrink-0 group-data-[collapsible=icon]:hidden">
            <Badge
              variant="outline"
              class="text-[9px] uppercase font-mono px-1.5 py-0"
              :class="currentUser.role === 'curriculum'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                : currentUser.role === 'partner'
                ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 font-medium'
                : 'bg-primary/10 text-primary border-primary/30'"
            >
              {{ currentUser.role === 'curriculum' ? 'Kurikulum' : currentUser.role === 'partner' ? 'Partner' : 'Siswa' }}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              id="sidebar-logout-btn"
              class="size-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md shrink-0 cursor-pointer"
              title="Keluar dari Akun"
              @click.stop="logoutUser"
            >
              <LogOut class="size-3" />
            </Button>
          </div>
        </div>
      </div>

      <div v-else>
        <Button
          variant="default"
          size="sm"
          class="w-full h-8.5 text-xs gap-2 justify-center cursor-pointer shadow-xs group-data-[collapsible=icon]:px-0"
          @click="isAuthDialogOpen = true"
          title="Masuk atau Daftar Akun"
        >
          <User class="size-3.5 shrink-0" />
          <span class="group-data-[collapsible=icon]:hidden font-medium">Masuk / Daftar</span>
        </Button>
      </div>
    </SidebarFooter>

    <!-- Edge Rail to allow dragging/expanding on desktop -->
    <SidebarRail />

    <!-- Audio Settings Dialog -->
    <AudioSettingsDialog v-model:open="isAudioSettingsOpen" />

    <!-- User Guide Modal -->
    <UserGuideModal v-model:open="isGuideModalOpen" />

    <!-- Authentication Dialog -->
    <AuthDialog v-model:open="isAuthDialogOpen" />
  </Sidebar>
</template>
