<script setup lang="ts">
import { ref } from 'vue'
import { Badge } from '@/components/ui/badge'
import {
  HelpCircle,
  ChevronDown
} from '@lucide/vue'

const activeIndex = ref<number | null>(0)

function toggleFaq(index: number) {
  activeIndex.value = activeIndex.value === index ? null : index
}

const faqs = [
  {
    q: 'Apakah platform Lingua LMS gratis digunakan?',
    a: 'Ya, Lingua LMS 100% gratis digunakan. Anda dapat mengakses materi tata bahasa, bank latihan kuis, fitur audio penutur asli, dan sertifikat kelulusan tanpa biaya berlangganan dan bebas dari iklan.'
  },
  {
    q: 'Bagaimana cara memperoleh sertifikat kelulusan resmi?',
    a: 'Sertifikat otomatis diterbitkan setelah Anda menyelesaikan modul bacaan Markdown dan lulus kuis evaluasi dengan skor kelulusan yang memadai. Sertifikat dilengkapi nomor seri unik dan QR Code yang dapat langsung diunduh dalam format PNG atau dicetak sebagai PDF.'
  },
  {
    q: 'Bagaimana cara memverifikasi keabsahan sertifikat?',
    a: 'Setiap pihak (seperti perekrut atau institusi) dapat memverifikasi keaslian sertifikat secara publik kapan saja dengan memindai QR Code menggunakan kamera ponsel atau memasukkan nomor ID sertifikat di halaman Verifikasi Sertifikat kami.'
  },
  {
    q: 'Bisakah saya membuat atau mengimpor kursus bahasa saya sendiri?',
    a: 'Tentu saja! Anda dapat membuat kursus baru serta mengunggah file materi Markdown (.md) dan bank soal CSV (.csv) secara mandiri lewat fitur "Buat & Impor Kursus". Kursus dapat diatur menjadi publik (bisa diakses semua pembelajar) atau privat (khusus Anda sendiri).'
  },
  {
    q: 'Format soal apa saja yang didukung pada bank kuis CSV?',
    a: 'Tiga format utama: 1) Isian Manual (dilengkapi algoritma toleransi typo pintar Levenshtein), 2) Pilihan Ganda Rumpang, dan 3) Susun Kata Menjadi Kalimat Utuh (klik urutan kata interaktif).'
  },
  {
    q: 'Apakah pelafalan audio TTS berfungsi di smartphone?',
    a: 'Ya! Fitur audio memanfaatkan standar Web Speech API peramban modern (Google Chrome, Safari, Firefox, Edge) yang telah didukung secara bawaan baik di perangkat desktop, laptop, tablet, maupun ponsel pintar Android dan iOS.'
  }
]
</script>

<template>
  <section id="faq" class="py-20 md:py-28 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
    <!-- Section Title -->
    <div class="text-center max-w-3xl mx-auto mb-14">
      <Badge variant="outline" class="mb-3 px-3.5 py-1 font-semibold border-primary/30 text-primary bg-primary/5">
        <HelpCircle class="size-3.5 mr-1 text-primary" />
        Pertanyaan Umum (FAQ)
      </Badge>
      <h2 class="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
        Pertanyaan yang Sering Diajukan
      </h2>
      <p class="mt-4 text-muted-foreground text-sm sm:text-base leading-relaxed">
        Jawaban cepat seputar cara kerja platform, sertifikasi kelulusan, format soal, dan fitur audio.
      </p>
    </div>

    <!-- Accordion List -->
    <div class="space-y-3.5">
      <div
        v-for="(item, idx) in faqs"
        :key="idx"
        class="border border-border/70 rounded-2xl bg-card overflow-hidden transition-colors"
        :class="activeIndex === idx ? 'border-primary/40 shadow-xs' : 'hover:border-border'"
      >
        <button
          @click="toggleFaq(idx)"
          class="w-full py-4.5 px-6 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-foreground cursor-pointer"
        >
          <span>{{ item.q }}</span>
          <ChevronDown
            :class="[
              'size-4 text-muted-foreground transition-transform duration-200 shrink-0',
              activeIndex === idx && 'rotate-180 text-primary'
            ]"
          />
        </button>

        <div
          v-if="activeIndex === idx"
          class="px-6 pb-5 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40 animate-in fade-in duration-200"
        >
          {{ item.a }}
        </div>
      </div>
    </div>
  </section>
</template>
