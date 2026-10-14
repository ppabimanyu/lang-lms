<script setup lang="ts">
import { activeDownloadToast, dismissDownloadToast } from '@/lib/download'
import { AlertCircle, FileCheck, X } from '@lucide/vue'
</script>

<template>
  <teleport to="body">
    <transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="transform translate-y-[-16px] opacity-0 scale-95"
      enter-to-class="transform translate-y-0 opacity-100 scale-100"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="transform translate-y-0 opacity-100 scale-100"
      leave-to-class="transform translate-y-[-16px] opacity-0 scale-95"
    >
      <div
        v-if="activeDownloadToast"
        class="fixed top-5 right-5 z-[9999] max-w-sm w-full pointer-events-auto"
      >
        <div
          class="rounded-xl border shadow-xl p-4 flex items-start gap-3 backdrop-blur-xl transition-all"
          :class="[
            activeDownloadToast.type === 'error'
              ? 'bg-destructive/10 border-destructive/30 text-destructive'
              : 'bg-card/95 border-emerald-500/40 text-foreground shadow-emerald-500/10'
          ]"
        >
          <!-- Status Icon -->
          <div
            class="size-8 rounded-lg flex items-center justify-center shrink-0"
            :class="[
              activeDownloadToast.type === 'error'
                ? 'bg-destructive text-destructive-foreground'
                : 'bg-emerald-500 text-white shadow-xs'
            ]"
          >
            <AlertCircle v-if="activeDownloadToast.type === 'error'" class="size-4" />
            <FileCheck v-else class="size-4" />
          </div>

          <!-- Message & Filename -->
          <div class="flex-1 min-w-0 space-y-0.5">
            <div class="text-xs font-bold leading-tight flex items-center gap-1.5">
              <span>{{ activeDownloadToast.type === 'error' ? 'Unduhan Gagal' : 'File Berhasil Diunduh' }}</span>
              <span v-if="activeDownloadToast.type !== 'error'" class="size-1.5 rounded-full bg-emerald-500"></span>
            </div>
            <p class="text-[11px] text-muted-foreground truncate">
              {{ activeDownloadToast.message }}
            </p>
            <div
              v-if="activeDownloadToast.filename"
              class="font-mono text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded w-fit max-w-full truncate mt-1"
            >
              {{ activeDownloadToast.filename }}
            </div>
          </div>

          <!-- Dismiss Button -->
          <button
            type="button"
            @click="dismissDownloadToast"
            class="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1 -mt-1 rounded-md"
            title="Tutup Notifikasi"
          >
            <X class="size-3.5" />
          </button>
        </div>
      </div>
    </transition>
  </teleport>
</template>
