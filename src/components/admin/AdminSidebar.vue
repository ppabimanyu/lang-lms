<script setup lang="ts">
import { adminActiveTab, currentUser, logoutUser, isServerConnected } from '@/lib/storage'
import type { AdminNavigationTab } from '@/types'
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
  SidebarFooter
} from '@/components/ui/sidebar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Activity,
  SlidersHorizontal,
  ShieldAlert,
  Moon,
  Sun,
  LogOut
} from '@lucide/vue'

import { isDarkMode, toggleTheme as toggleDarkMode } from '@/lib/theme'

function selectTab(tab: AdminNavigationTab) {
  adminActiveTab.value = tab
}
</script>

<template>
  <Sidebar collapsible="icon" class="border-r border-sidebar-border select-none">
    <!-- Header: Admin Brand -->
    <SidebarHeader class="p-3.5 border-b border-sidebar-border/60">
      <div class="flex items-center gap-3 overflow-hidden">
        <div class="size-10 rounded-xl bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-600/30 shadow-xs">
          <ShieldAlert class="size-5" />
        </div>
        <div class="flex flex-col min-w-0 transition-opacity duration-200 group-data-[collapsible=icon]:hidden">
          <div class="flex items-center gap-1.5">
            <span class="font-bold text-sm tracking-tight text-sidebar-foreground truncate">Lingua Admin</span>
            <span class="size-1.5 rounded-full" :class="isServerConnected ? 'bg-emerald-500' : 'bg-amber-500'" :title="isServerConnected ? 'PostgreSQL Terhubung' : 'Offline'"></span>
          </div>
          <span class="text-[11px] text-muted-foreground truncate font-mono">
            Platform Console
          </span>
        </div>
      </div>
    </SidebarHeader>

    <!-- Sidebar Navigation -->
    <SidebarContent class="gap-1 p-2">
      <SidebarGroup class="px-1 py-1">
        <SidebarGroupLabel class="text-[10px] uppercase font-semibold text-muted-foreground/80 tracking-wider">
          Menu Pengawasan
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu class="gap-1.5">
            <!-- 1. Dashboard -->
            <SidebarMenuItem>
              <SidebarMenuButton
                :is-active="adminActiveTab === 'dashboard'"
                tooltip="Dashboard"
                @click="selectTab('dashboard')"
                class="data-[active=true]:bg-indigo-600 data-[active=true]:text-white data-[active=true]:font-medium transition-colors cursor-pointer"
              >
                <LayoutDashboard class="size-4" />
                <span>Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <!-- 2. User -->
            <SidebarMenuItem>
              <SidebarMenuButton
                :is-active="adminActiveTab === 'users'"
                tooltip="User"
                @click="selectTab('users')"
                class="data-[active=true]:bg-indigo-600 data-[active=true]:text-white data-[active=true]:font-medium transition-colors cursor-pointer"
              >
                <Users class="size-4" />
                <span>User</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <!-- 3. Courses -->
            <SidebarMenuItem>
              <SidebarMenuButton
                :is-active="adminActiveTab === 'courses'"
                tooltip="Courses"
                @click="selectTab('courses')"
                class="data-[active=true]:bg-indigo-600 data-[active=true]:text-white data-[active=true]:font-medium transition-colors cursor-pointer"
              >
                <BookOpen class="size-4" />
                <span>Courses</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <!-- 4. Kuis Activity -->
            <SidebarMenuItem>
              <SidebarMenuButton
                :is-active="adminActiveTab === 'activity'"
                tooltip="Kuis Activity"
                @click="selectTab('activity')"
                class="data-[active=true]:bg-indigo-600 data-[active=true]:text-white data-[active=true]:font-medium transition-colors cursor-pointer"
              >
                <Activity class="size-4" />
                <span>Kuis Activity</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <!-- 5. Feature Flags -->
            <SidebarMenuItem>
              <SidebarMenuButton
                :is-active="adminActiveTab === 'flags'"
                tooltip="Feature Flags"
                @click="selectTab('flags')"
                class="data-[active=true]:bg-indigo-600 data-[active=true]:text-white data-[active=true]:font-medium transition-colors cursor-pointer"
              >
                <SlidersHorizontal class="size-4" />
                <span>Feature Flags</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <!-- Sidebar Footer (Harmonized with User Sidebar style) -->
    <SidebarFooter class="p-3 border-t border-sidebar-border gap-2">
      <!-- Baris 1: Tema (Mode Terang / Gelap) -->
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

      <!-- Baris 2: Kartu Akun Admin dengan Logout di Sisi Kanan -->
      <div
        class="p-2.5 rounded-xl bg-sidebar-accent/80 border border-sidebar-border/80 flex items-center justify-between group-data-[collapsible=icon]:p-1.5 shadow-2xs group/admin"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="size-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
            AD
          </div>
          <div class="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span class="text-xs font-semibold text-sidebar-foreground truncate">{{ currentUser?.name || 'Administrator' }}</span>
            <span class="text-[10px] text-muted-foreground truncate">{{ currentUser?.email || 'admin@lingua.com' }}</span>
          </div>
        </div>

        <div class="flex items-center gap-1.5 shrink-0 group-data-[collapsible=icon]:hidden">
          <Badge variant="outline" class="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30 text-[9px] uppercase font-mono px-1.5 py-0">
            Admin
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            class="size-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md shrink-0 cursor-pointer"
            title="Keluar dari Akun Admin"
            @click.stop="logoutUser"
          >
            <LogOut class="size-3" />
          </Button>
        </div>
      </div>
    </SidebarFooter>
  </Sidebar>
</template>
