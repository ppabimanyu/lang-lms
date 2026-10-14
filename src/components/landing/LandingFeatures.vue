<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Sparkles,
  Volume2,
  FileSpreadsheet,
  Flame,
  Award,
  Database,
  Layers
} from '@lucide/vue'

const features = [
  {
    icon: Layers,
    iconColor: 'text-primary bg-primary/10',
    title: 'Unit Kursus Terpadu',
    badge: 'Kurikulum Utuh',
    description: 'Setiap kursus memadukan teori tata bahasa berformat Markdown dengan bank latihan kuis CSV. Pembelajar memahami materi terlebih dahulu sebelum diuji kompetensinya.'
  },
  {
    icon: Volume2,
    iconColor: 'text-teal-500 bg-teal-500/10',
    title: 'TTS Alami 11 Bahasa',
    badge: 'Web Speech API',
    description: 'Pelafalan audio jernih dari penutur asli untuk 11 bahasa dunia (Jerman, Spanyol, Prancis, Jepang, dll.) dengan kontrol tempo fleksibel 0.75x hingga 1.0x.'
  },
  {
    icon: FileSpreadsheet,
    iconColor: 'text-emerald-500 bg-emerald-500/10',
    title: '3 Format Kuis Interaktif',
    badge: 'Smart Evaluation',
    description: 'Mendukung format Isian Singkat dengan toleransi typo pintar (Levenshtein), Pilihan Ganda Rumpang, dan Drag/Click Susun Kata menjadi kalimat gramatikal.'
  },
  {
    icon: Award,
    iconColor: 'text-amber-500 bg-amber-500/10',
    title: 'Sertifikat Digital Ber-QR Code',
    badge: 'Verifikasi Resmi',
    description: 'Raih sertifikat kelulusan berstandar resmi setelah menyelesaikan kursus dengan akurasi memuaskan. Dilengkapi QR Code dan nomor ID unik untuk verifikasi publik.'
  },
  {
    icon: Flame,
    iconColor: 'text-indigo-500 bg-indigo-500/10',
    title: 'Gamifikasi, XP & Streak',
    badge: 'Motivasi Belajar',
    description: 'Kumpulkan poin XP untuk setiap kuis yang diselesaikan, pertahankan rekor streak hari aktif belajar, pantau leaderboard kelas, dan evaluasi soal lewat Review Mode.'
  },
  {
    icon: Database,
    iconColor: 'text-blue-500 bg-blue-500/10',
    title: 'Database Relasional PostgreSQL',
    badge: 'Production Ready',
    description: 'Data pengguna, kursus, ulasan, dan riwayat skor tersimpan aman di database PostgreSQL 16 dengan enkripsi password bcrypt dan token JWT terpercaya.'
  }
]
</script>

<template>
  <section id="fitur" class="py-20 md:py-28 bg-muted/20 border-t border-border/60 relative overflow-hidden">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <!-- Section Title -->
      <div class="text-center max-w-3xl mx-auto mb-16">
        <Badge variant="outline" class="mb-3 px-3.5 py-1 font-semibold border-primary/30 text-primary bg-primary/5">
          <Sparkles class="size-3.5 mr-1 text-primary" />
          Fitur Unggulan Platform
        </Badge>
        <h2 class="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Dirancang untuk Hasil Belajar Nyata
        </h2>
        <p class="mt-4 text-muted-foreground text-sm sm:text-base leading-relaxed">
          Semua alat bantu yang Anda butuhkan untuk menguasai bahasa asing secara mandiri, terstruktur, dan bersertifikat.
        </p>
      </div>

      <!-- Feature Grid: 6 Pillars -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        <Card
          v-for="(f, i) in features"
          :key="i"
          class="border-border/70 bg-card hover:border-primary/50 transition-all hover:shadow-lg hover:-translate-y-1 relative group overflow-hidden"
        >
          <CardContent class="p-6 sm:p-7 space-y-4">
            <!-- Icon & Badge Header -->
            <div class="flex items-center justify-between">
              <div :class="['size-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105', f.iconColor]">
                <component :is="f.icon" class="size-6" />
              </div>
              <Badge variant="secondary" class="text-[11px] font-medium font-mono">
                {{ f.badge }}
              </Badge>
            </div>

            <!-- Title & Description -->
            <div class="space-y-2">
              <h3 class="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                {{ f.title }}
              </h3>
              <p class="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {{ f.description }}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </section>
</template>
